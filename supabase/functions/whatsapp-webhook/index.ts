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

    // Handle message status updates (sent/delivered/read)
    const statuses = value?.statuses;
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        const messageId = status.id; // WhatsApp message ID
        const statusValue = status.status; // sent, delivered, read, etc.
        const ts = status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString();

        console.log('Received status update:', { messageId, statusValue, ts });

        if (messageId) {
          // Update based on status type
          if (statusValue === 'delivered') {
            const { error: updateError } = await supabase
              .from('mensagens')
              .update({
                delivered_at: ts,
              })
              .eq('whatsapp_message_id', messageId);

            if (updateError) {
              console.error('Error updating delivered_at from WhatsApp:', updateError);
            } else {
              console.log(`Updated delivered_at for mensagem with whatsapp_message_id=${messageId}`);
            }
          } else if (statusValue === 'read') {
            const { error: updateError } = await supabase
              .from('mensagens')
              .update({
                read_at: ts,
              })
              .eq('whatsapp_message_id', messageId);

            if (updateError) {
              console.error('Error updating read_at from WhatsApp:', updateError);
            } else {
              console.log(`Updated read_at for mensagem with whatsapp_message_id=${messageId}`);
            }
          }
        }
      }
    }

    const messages = value?.messages;

    if (messages && messages.length > 0) {
      for (const message of messages) {
        const from = message.from; // Phone number
        const messageBody = message.text?.body || '';
        const messageType = message.type;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

        console.log(`Message from ${from}: Type: ${messageType}`);

        // Find or create cliente
        let cliente;
        const { data: existingCliente } = await supabase
          .from('clientes')
          .select('*')
          .eq('telefone', from)
          .single();

        if (existingCliente) {
          cliente = existingCliente;
          
          // Update cliente data if we have profile info from WhatsApp
          const profileName = value?.contacts?.[0]?.profile?.name;
          const profilePicture = value?.contacts?.[0]?.profile?.picture;
          
          const updates: any = {};
          if (profileName && existingCliente.nome.startsWith('Cliente ')) {
            updates.nome = profileName;
          }
          if (profileName) {
            updates.push_name = profileName;
          }
          if (profilePicture) {
            updates.profile_picture_url = profilePicture;
          }
          
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('clientes')
              .update(updates)
              .eq('id', existingCliente.id);
            
            cliente = { ...existingCliente, ...updates };
          }
        } else {
          // Get profile info from WhatsApp contact info
          const profileName = value?.contacts?.[0]?.profile?.name || `Cliente ${from}`;
          const profilePicture = value?.contacts?.[0]?.profile?.picture;
          
          const { data: newCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert({
              nome: profileName,
              telefone: from,
              push_name: profileName,
              profile_picture_url: profilePicture || null,
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
          
          // Immediately broadcast typing indicator for instant feedback
          const typingChannel = supabase.channel(`typing:${atendimento.id}`);
          typingChannel.subscribe();
          typingChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              atendimentoId: atendimento.id,
              remetenteTipo: 'cliente',
              isTyping: true
            }
          });
          // Don't remove channel yet - will do after message is saved
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

        // ... keep existing code from line 169 onwards
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
