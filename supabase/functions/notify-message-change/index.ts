import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { atendimento_id, message_id } = await req.json();

    if (!atendimento_id) {
      throw new Error('atendimento_id é obrigatório');
    }

    console.log('📤 Enviando broadcast de mudança de mensagem:', { atendimento_id, message_id });

    // Enviar broadcast via canal do atendimento
    const channel = supabaseClient.channel(`atendimento:${atendimento_id}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'message_change',
      payload: {
        atendimento_id,
        message_id,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('❌ Erro ao notificar mudança:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
