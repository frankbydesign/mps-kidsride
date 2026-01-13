import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { translateMessage, detectLanguage } from '@/lib/translate';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const params = new URLSearchParams(body);

    // Verify Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature') || '';
    const url = request.url;

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      url,
      Object.fromEntries(params)
    );

    if (!isValid) {
      console.error('Invalid Twilio signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Extract message data
    const from = params.get('From');
    const body_text = params.get('Body');
    const messageSid = params.get('MessageSid');

    if (!from || !body_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Detect language and translate if not English
    const detectedLanguage = await detectLanguage(body_text);
    let translatedText = body_text;

    if (detectedLanguage !== 'en') {
      translatedText = await translateMessage(body_text, detectedLanguage, 'en');
    }

    // Find or create conversation
    let { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone_number', from)
      .single();

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          phone_number: from,
          contact_name: from,
          detected_language: detectedLanguage,
          archived: false
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      conversation = newConversation;
    } else {
      // Update detected language if needed
      if (conversation.detected_language !== detectedLanguage) {
        await supabaseAdmin
          .from('conversations')
          .update({ detected_language: detectedLanguage })
          .eq('id', conversation.id);
      }
    }

    // Save message
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        original_text: body_text,
        translated_text: detectedLanguage !== 'en' ? translatedText : null,
        detected_language: detectedLanguage,
        twilio_sid: messageSid,
        status: 'received'
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Update conversation's last message time
    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Return TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
