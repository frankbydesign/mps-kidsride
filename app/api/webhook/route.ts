import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { translateMessage, detectLanguage } from '@/lib/translate';
import type { Conversation } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Use admin client singleton for better performance
    const supabaseAdmin = createAdminClient();

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

    // Validate required fields
    if (!from || !body_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(from)) {
      console.error('Invalid phone number format:', from);
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Validate message length
    if (body_text.length === 0 || body_text.length > 1600) {
      return NextResponse.json({ error: 'Invalid message length' }, { status: 400 });
    }

    // Detect language and translate if not English
    let detectedLanguage = 'en';
    let translatedText = body_text;
    let translationError = null;

    try {
      detectedLanguage = await detectLanguage(body_text);

      if (detectedLanguage !== 'en') {
        translatedText = await translateMessage(body_text, detectedLanguage, 'en');
      }
    } catch (error: unknown) {
      console.error('Translation error:', error);
      translationError = error instanceof Error ? error.message : 'Translation failed';
      // Continue processing - save message without translation
    }

    // Find or create conversation
    const { data: existingConversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone_number', from)
      .single();

    let conversation: Conversation;

    if (!existingConversation) {
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          phone_number: from,
          contact_name: from,
          detected_language: detectedLanguage,
          status: 'new'
        } as never)
        .select()
        .single();

      if (convError || !newConversation) {
        console.error('Error creating conversation:', convError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      conversation = newConversation as Conversation;
    } else {
      conversation = existingConversation as Conversation;
      // Update detected language if needed
      if (conversation.detected_language !== detectedLanguage) {
        await supabaseAdmin
          .from('conversations')
          .update({ detected_language: detectedLanguage } as never)
          .eq('id', conversation.id);
      }
    }

    // Save message
    const conversationData = conversation;
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationData.id,
        direction: 'inbound',
        original_text: body_text,
        translated_text: detectedLanguage !== 'en' ? translatedText : null,
        detected_language: detectedLanguage,
        twilio_sid: messageSid,
        status: 'received',
        translation_error: translationError
      } as never);

    if (messageError) {
      console.error('Error saving message:', messageError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Update conversation's last message time and re-open if resolved
    const conversationUpdate: Record<string, string> = {
      last_reply_at: new Date().toISOString()
    };
    if (conversationData.status === 'resolved') {
      conversationUpdate.status = 'active';
    }
    await supabaseAdmin
      .from('conversations')
      .update(conversationUpdate as never)
      .eq('id', conversationData.id);

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
