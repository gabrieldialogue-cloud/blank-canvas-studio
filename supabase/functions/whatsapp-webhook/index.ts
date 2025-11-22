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
            
            // Update cliente name if we have profile name from WhatsApp
            const profileName = value?.contacts?.[0]?.profile?.name;
            if (profileName && existingCliente.nome.startsWith('Cliente ')) {
              await supabase
                .from('clientes')
                .update({ nome: profileName })
                .eq('id', existingCliente.id);
              cliente.nome = profileName;
            }
          } else {
            // Get profile name from WhatsApp contact info
            const profileName = value?.contacts?.[0]?.profile?.name || `Cliente ${from}`;
            
            const { data: newCliente, error: clienteError } = await supabase
              .from('clientes')
              .insert({
                nome: profileName,
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

          // Handle media messages (image, document, video, audio)
          let attachmentUrl = null;
          let attachmentType = null;
          let finalContent = messageBody; // Initialize here to avoid scope issues

          if (messageType === 'image' || messageType === 'document' || messageType === 'video' || messageType === 'audio') {
            try {
              const mediaId = message.image?.id || message.document?.id || message.video?.id || message.audio?.id;
              
              if (mediaId) {
                const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
                
                // Get media URL from WhatsApp
                const mediaResponse = await fetch(`https://graph.facebook.com/v17.0/${mediaId}`, {
                  headers: { 'Authorization': `Bearer ${whatsappToken}` }
                });
                const mediaData = await mediaResponse.json();
                
                if (mediaData.url) {
                  // Download media file
                  const fileResponse = await fetch(mediaData.url, {
                    headers: { 'Authorization': `Bearer ${whatsappToken}` }
                  });
                  
                  const fileBlob = await fileResponse.blob();
                  
                  // Get proper file extension
                  let fileExt = 'bin';
                  const mimeType = mediaData.mime_type || fileBlob.type;
                  
                  // Map common mime types to extensions
                  const mimeToExt: Record<string, string> = {
                    'image/jpeg': 'jpg',
                    'image/png': 'png',
                    'image/gif': 'gif',
                    'image/webp': 'webp',
                    'application/pdf': 'pdf',
                    'application/zip': 'zip',
                    'application/x-rar-compressed': 'rar',
                    'application/msword': 'doc',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                    'application/vnd.ms-excel': 'xls',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                    'text/plain': 'txt',
                    'text/csv': 'csv',
                  };
                  
                  if (mimeType && mimeToExt[mimeType]) {
                    fileExt = mimeToExt[mimeType];
                  } else if (message.document?.filename) {
                    const parts = message.document.filename.split('.');
                    if (parts.length > 1) {
                      fileExt = parts[parts.length - 1];
                    }
                  }
                  
                  const fileName = `${atendimento.id}/${Date.now()}.${fileExt}`;
                  
                  // Upload to storage without mime type restriction
                  const { error: uploadError } = await supabase.storage
                    .from('chat-files')
                    .upload(fileName, fileBlob, {
                      contentType: mimeType,
                      upsert: false
                    });

                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                      .from('chat-files')
                      .getPublicUrl(fileName);
                    
                    attachmentUrl = publicUrl;
                    attachmentType = messageType === 'image' ? 'image' : 'document';
                    console.log(`Media uploaded: ${attachmentUrl} (${mimeType})`);
                  } else {
                    console.error('Error uploading media:', uploadError);
                    
                    // Provide specific error message
                    if (uploadError.message?.includes('maximum allowed size') || uploadError.message?.includes('exceeded')) {
                      finalContent = `Documento "${message.document?.filename || 'arquivo'}" é muito grande (máximo 20MB). Por favor, envie um arquivo menor.`;
                    } else if (uploadError.message?.includes('not supported')) {
                      finalContent = `Tipo de arquivo "${message.document?.filename || 'arquivo'}" não é suportado.`;
                    } else {
                      finalContent = `Não foi possível carregar o arquivo "${message.document?.filename || 'arquivo'}". Erro: ${uploadError.message}`;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error processing media:', error);
            }
          }

          // Set default message if no content yet
          if (!finalContent && !attachmentUrl) {
            if (messageType === 'document') {
              const filename = message.document?.filename || 'Documento';
              finalContent = `Documento "${filename}" não pôde ser carregado.`;
            } else if (messageType === 'image' || messageType === 'video' || messageType === 'audio') {
              finalContent = 'Mídia recebida, mas não foi possível carregá-la.';
            } else {
              finalContent = 'Mensagem recebida.';
            }
          }

          // Save message
          const { error: messageError } = await supabase
            .from('mensagens')
            .insert({
              atendimento_id: atendimento.id,
              remetente_tipo: 'cliente',
              conteudo: finalContent,
              created_at: timestamp,
              attachment_url: attachmentUrl,
              attachment_type: attachmentType,
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
