import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import LibAV from "https://esm.sh/@libav.js/variant-webm-vp9@5.4.8.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webmUrl, atendimentoId } = await req.json();

    if (!webmUrl || !atendimentoId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: webmUrl and atendimentoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Converting audio from WebM to OGG/Opus:', webmUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download WebM file
    const webmResponse = await fetch(webmUrl);
    if (!webmResponse.ok) {
      throw new Error(`Failed to download WebM file: ${webmResponse.statusText}`);
    }

    const webmData = await webmResponse.arrayBuffer();
    console.log('Downloaded WebM file, size:', webmData.byteLength, 'bytes');

    // Initialize libav.js
    console.log('Initializing libav.js for conversion...');
    const libav = await LibAV.LibAV();
    
    // Write input WebM file to libav.js virtual filesystem
    await libav.writeFile("input.webm", new Uint8Array(webmData));
    
    // Convert WebM to OGG/Opus using libav.js
    console.log('Converting WebM to OGG/Opus with libav.js...');
    await libav.ffmpeg(
      "-i", "input.webm",
      "-vn",
      "-c:a", "libopus",
      "-b:a", "32k",
      "-f", "ogg",
      "-y", "output.ogg"
    );
    
    // Read converted OGG file from libav.js virtual filesystem
    const oggData = await libav.readFile("output.ogg");
    
    // Cleanup libav.js
    await libav.unlink("input.webm");
    await libav.unlink("output.ogg");
    
    console.log('Conversion completed successfully');
    console.log('Converted OGG file size:', oggData.byteLength, 'bytes');

    // Upload OGG to Supabase Storage
    const fileName = `${Date.now()}-audio.ogg`;
    const filePath = `${atendimentoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-audios')
      .upload(filePath, oggData, {
        contentType: 'audio/ogg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-audios')
      .getPublicUrl(filePath);

    console.log('OGG file uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        oggUrl: publicUrl,
        originalSize: webmData.byteLength,
        convertedSize: oggData.byteLength 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in convert-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
