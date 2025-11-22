import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET request - Webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.error('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // POST request - Incoming messages
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Received webhook:', JSON.stringify(body, null, 2));

      // Process WhatsApp webhook data
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        for (const message of messages) {
          const from = message.from; // Phone number
          const messageBody = message.text?.body || '';
          const messageType = message.type;
          const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

          console.log(`Message from ${from}: ${messageBody}`);

          // Find or create cliente
          let cliente;
          const { data: existingCliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('telefone', from)
            .single();

          if (existingCliente) {
            cliente = existingCliente;
          } else {
            const { data: newCliente, error: clienteError } = await supabase
              .from('clientes')
              .insert({
                nome: `Cliente ${from}`,
                telefone: from,
              })
              .select()
              .single();

            if (clienteError) {
              console.error('Error creating cliente:', clienteError);
              continue;
            }
            cliente = newCliente;
          }

          // Find or create atendimento
          const { data: atendimentos } = await supabase
            .from('atendimentos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .neq('status', 'encerrado')
            .order('created_at', { ascending: false })
            .limit(1);

          let atendimento;
          if (atendimentos && atendimentos.length > 0) {
            atendimento = atendimentos[0];
          } else {
            // Find an available vendedor to assign (simple round-robin for now)
            const { data: vendedores } = await supabase
              .from('usuarios')
              .select('id')
              .eq('role', 'vendedor')
              .limit(1);

            const vendedorId = vendedores && vendedores.length > 0 ? vendedores[0].id : null;

            const { data: newAtendimento, error: atendimentoError } = await supabase
              .from('atendimentos')
              .insert({
                cliente_id: cliente.id,
                marca_veiculo: 'A definir',
                status: 'ia_respondendo',
                vendedor_fixo_id: vendedorId,
              })
              .select()
              .single();

            if (atendimentoError) {
              console.error('Error creating atendimento:', atendimentoError);
              continue;
            }
            atendimento = newAtendimento;
            console.log(`Atendimento assigned to vendedor: ${vendedorId}`);
          }

          // Save message
          const { error: messageError } = await supabase
            .from('mensagens')
            .insert({
              atendimento_id: atendimento.id,
              remetente_tipo: 'cliente',
              conteudo: messageBody,
              created_at: timestamp,
            });

          if (messageError) {
            console.error('Error saving message:', messageError);
          }

          // TODO: Trigger AI response logic here
          console.log(`Message saved for atendimento ${atendimento.id}`);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
