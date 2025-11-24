import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Check if audio is empty or too small (less than 1KB)
    if (binaryAudio.length < 1024) {
      console.log('Audio file is empty or too small');
      return new Response(
        JSON.stringify({ text: '[Áudio vazio - sem conteúdo para transcrever]' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese for better accuracy
    formData.append('temperature', '0'); // More deterministic transcription for higher quality
    formData.append('response_format', 'verbose_json'); // Get detailed response with timestamps

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();

    // Check if transcription is empty or contains very little content
    const transcribedText = result.text?.trim();
    const duration = result.duration || 0;
    
    // List of irrelevant phrases that should be considered as empty audio
    const irrelevantPhrases = [
      'legendas pela comunidade amara.org',
      'legendas pela comunidade',
      'amara.org',
      'subtitle',
      'subtitles',
      'closed caption',
    ];
    
    // If no text at all
    if (!transcribedText || transcribedText.length === 0) {
      console.log('Transcription returned empty text');
      return new Response(
        JSON.stringify({ text: '[Áudio vazio - sem conteúdo para transcrever]' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if transcription contains only irrelevant phrases (watermarks, etc)
    const lowerText = transcribedText.toLowerCase();
    const isIrrelevant = irrelevantPhrases.some(phrase => lowerText.includes(phrase));
    if (isIrrelevant && transcribedText.length < 100) {
      console.log('Transcription contains only irrelevant content:', transcribedText);
      return new Response(
        JSON.stringify({ text: '[Áudio vazio - sem conteúdo para transcrever]' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If audio is very short (less than 0.5 seconds) and text is minimal, it's likely empty or just noise
    if (duration < 0.5 && transcribedText.length < 5) {
      console.log('Transcription is too short, likely empty or noise');
      return new Response(
        JSON.stringify({ text: '[Áudio vazio - sem conteúdo para transcrever]' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});