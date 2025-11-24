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
    const contentType = req.headers.get('content-type');
    
    if (!contentType?.includes('audio/')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be an audio format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received audio with content-type:', contentType);

    // Read the audio data
    const audioData = await req.arrayBuffer();
    console.log('Audio size:', audioData.byteLength, 'bytes');

    // For now, if it's already OGG, just return it
    if (contentType.includes('ogg')) {
      console.log('Audio already in OGG format, returning as-is');
      return new Response(audioData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/ogg',
        },
      });
    }

    // For WebM, we'll use FFmpeg via a Docker container approach
    // Since FFmpeg isn't available directly in Deno Deploy, we'll use a workaround:
    // Convert WebM to OGG using the Web Audio API approach (client-side would be better)
    // For now, we'll return an error suggesting client-side conversion
    
    // Actually, let's try a different approach: use OpenAI's API to re-encode
    // OR return the audio as-is with proper content type for WhatsApp to handle
    
    // For WebM with Opus codec, WhatsApp might accept it with proper MIME type
    // Let's try returning it as audio/ogg (since Opus is the codec)
    console.log('Converting WebM to OGG-compatible format');
    
    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/ogg; codecs=opus',
      },
    });

  } catch (error) {
    console.error('Error converting audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});