import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, audioUrl, mediaType, mediaUrl, filename, caption } = await req.json();

    if (!to || (!message && !audioUrl && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and (message, audioUrl, or mediaUrl)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageType = audioUrl ? 'audio' : (mediaUrl ? mediaType : 'text');
    console.log(`Sending ${messageType} to ${to}`);

    let payload: any = {
      messaging_product: 'whatsapp',
      to: to,
    };

    if (audioUrl) {
      payload.type = 'audio';
      payload.audio = {
        link: audioUrl,
        voice: true, // Marca como mensagem de voz (PTT) ao invés de documento de áudio
      };
    } else if (mediaUrl && mediaType === 'image') {
      payload.type = 'image';
      payload.image = {
        link: mediaUrl,
      };
      if (caption) {
        payload.image.caption = caption;
      }
    } else if (mediaUrl && mediaType === 'document') {
      payload.type = 'document';
      payload.document = {
        link: mediaUrl,
        filename: filename || 'document',
      };
      if (caption) {
        payload.document.caption = caption;
      }
    } else {
      payload.type = 'text';
      payload.text = {
        body: message,
      };
    }

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', responseData);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: responseData }),
        { status: whatsappResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message sent successfully:', responseData);

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.messages?.[0]?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
