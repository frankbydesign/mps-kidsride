import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { translateMessage } from '@/lib/translate';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Authenticate user before allowing SMS send
    const supabaseServer = await createClient();
    const { data } = await supabaseServer.auth.getClaims();
    const user = data?.claims;

    // Verify user has valid session with sub claim (user ID)
    if (!user || !user.sub) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Verify user is an approved volunteer
    const { data: volunteer, error: volunteerError } = await supabaseServer
      .from('volunteers')
      .select('approved')
      .eq('id', user.sub)
      .single();

    if (volunteerError || !volunteer?.approved) {
      return NextResponse.json(
        { error: 'Forbidden - Volunteer approval required' },
        { status: 403 }
      );
    }

    const { conversationId, message, userId } = await request.json();

    // Verify userId in request matches authenticated user
    if (userId !== user.sub) {
      return NextResponse.json(
        { error: 'Forbidden - User ID mismatch' },
        { status: 403 }
      );
    }

    // Use admin client singleton for better performance
    const supabaseAdmin = createAdminClient();

    // Initialize Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Validate input
    if (!conversationId || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 1600) {
      return NextResponse.json(
        { error: 'Message too long (max 1600 characters)' },
        { status: 400 }
      );
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Translate message if needed
    let textToSend = message;
    const targetLanguage = (conversation as any).detected_language || 'en';

    if (targetLanguage !== 'en') {
      textToSend = await translateMessage(message, 'en', targetLanguage);
    }

    // Send SMS with retry logic
    let lastError = null;
    let twilioMessage = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        twilioMessage = await twilioClient.messages.create({
          body: textToSend,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: (conversation as any).phone_number
        });
        break; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`Send attempt ${attempt} failed:`, error);

        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Save message to database
    const messageStatus = twilioMessage ? 'sent' : 'failed';
    const { data: savedMessage, error: messageError } = await (supabaseAdmin
      .from('messages') as any)
      .insert({
        conversation_id: conversationId,
        volunteer_id: userId,
        direction: 'outbound',
        original_text: message,
        translated_text: targetLanguage !== 'en' ? textToSend : null,
        detected_language: 'en',
        twilio_sid: twilioMessage?.sid || null,
        status: messageStatus,
        error_message: lastError?.message || null
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Update conversation
    await (supabaseAdmin
      .from('conversations') as any)
      .update({
        last_reply_at: new Date().toISOString(),
        last_reply_by: userId
      })
      .eq('id', conversationId);

    if (!twilioMessage) {
      return NextResponse.json(
        {
          error: 'Failed to send SMS after 3 attempts',
          message: savedMessage
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: savedMessage,
      twilioSid: twilioMessage.sid
    });
  } catch (error: any) {
    console.error('Send error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
