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
            const { data: mensagem, error: updateError } = await supabase
              .from('mensagens')
              .update({
                delivered_at: ts,
              })
              .eq('whatsapp_message_id', messageId)
              .select('atendimento_id')
              .single();

            if (updateError) {
              console.error('Error updating delivered_at from WhatsApp:', updateError);
            } else {
              console.log(`Updated delivered_at for mensagem with whatsapp_message_id=${messageId}`);
              
              // Broadcast client online status when we receive delivered status
              if (mensagem?.atendimento_id) {
                try {
                  const channel = supabase.channel('global-client-presence');
                  await channel.subscribe();
                  
                  await channel.send({
                    type: 'broadcast',
                    event: 'client_online',
                    payload: {
                      atendimentoId: mensagem.atendimento_id,
                      isOnline: true,
                      timestamp: ts
                    }
                  });
                  
                  console.log(`Broadcasted client online for atendimento ${mensagem.atendimento_id}`);
                  await supabase.removeChannel(channel);
                } catch (broadcastError) {
                  console.error('Error broadcasting client online status:', broadcastError);
                }
              }
            }
          } else if (statusValue === 'read') {
            const { data: mensagem, error: updateError } = await supabase
              .from('mensagens')
              .update({
                read_at: ts,
              })
              .eq('whatsapp_message_id', messageId)
              .select('atendimento_id')
              .single();

            if (updateError) {
              console.error('Error updating read_at from WhatsApp:', updateError);
            } else {
              console.log(`Updated read_at for mensagem with whatsapp_message_id=${messageId}`);
              
              // Broadcast client online status when we receive read status
              if (mensagem?.atendimento_id) {
                try {
                  const channel = supabase.channel('global-client-presence');
                  await channel.subscribe();
                  
                  await channel.send({
                    type: 'broadcast',
                    event: 'client_online',
                    payload: {
                      atendimentoId: mensagem.atendimento_id,
                      isOnline: true,
                      timestamp: ts
                    }
                  });
                  
                  console.log(`Broadcasted client online for atendimento ${mensagem.atendimento_id}`);
                  await supabase.removeChannel(channel);
                } catch (broadcastError) {
                  console.error('Error broadcasting client online status:', broadcastError);
                }
              }
            }
          }
        }
      }
    }

    const messages = value?.messages;

    if (messages && messages.length > 0) {
      for (const message of messages) {
        const from = message.from; // Phone number
        const messageType = message.type; // text, image, document, etc.
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
          let profilePicture = value?.contacts?.[0]?.profile?.picture;
          
          // Se não tiver foto no payload, buscar através da API do WhatsApp
          if (!profilePicture || !existingCliente.profile_picture_url) {
            const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
            const waId = value?.contacts?.[0]?.wa_id || from;
            
            if (accessToken && waId) {
              try {
                console.log(`Tentando buscar foto de perfil para ${waId}`);
                const contactRes = await fetch(
                  `https://graph.facebook.com/v21.0/${waId}?fields=profile_pic`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                    }
                  }
                );
                
                if (contactRes.ok) {
                  const contactData = await contactRes.json();
                  profilePicture = contactData?.profile_pic;
                  console.log('Foto de perfil obtida:', profilePicture);
                } else {
                  const errorText = await contactRes.text();
                  console.error('Erro ao buscar foto de perfil (status):', contactRes.status, errorText);
                }
              } catch (err) {
                console.error('Erro ao buscar foto de perfil (exception):', err);
              }
            }
          }
          
          const updates: any = {};
          if (profileName && existingCliente.nome.startsWith('Cliente ')) {
            updates.nome = profileName;
          }
          if (profileName) {
            updates.push_name = profileName;
          }
          if (profilePicture && (!existingCliente.profile_picture_url || existingCliente.profile_picture_url !== profilePicture)) {
            updates.profile_picture_url = profilePicture;
          }
          
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('clientes')
              .update(updates)
              .eq('id', existingCliente.id);
            
            cliente = { ...existingCliente, ...updates };
            console.log('Cliente atualizado com foto de perfil:', updates);
          }
        } else {
          // Get profile info from WhatsApp contact info
          const profileName = value?.contacts?.[0]?.profile?.name || `Cliente ${from}`;
          let profilePicture = value?.contacts?.[0]?.profile?.picture;
          
          // Se não tiver foto no payload, buscar através da API do WhatsApp
          if (!profilePicture) {
            const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
            const waId = value?.contacts?.[0]?.wa_id || from;
            
            if (accessToken && waId) {
              try {
                console.log(`Tentando buscar foto de perfil para novo cliente ${waId}`);
                const contactRes = await fetch(
                  `https://graph.facebook.com/v21.0/${waId}?fields=profile_pic`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                    }
                  }
                );
                
                if (contactRes.ok) {
                  const contactData = await contactRes.json();
                  profilePicture = contactData?.profile_pic;
                  console.log('Foto de perfil obtida para novo cliente:', profilePicture);
                } else {
                  const errorText = await contactRes.text();
                  console.error('Erro ao buscar foto de perfil para novo cliente (status):', contactRes.status, errorText);
                }
              } catch (err) {
                console.error('Erro ao buscar foto de perfil para novo cliente:', err);
              }
            }
          }
          
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
          console.log('Novo cliente criado com foto de perfil:', profilePicture);
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

        if (!atendimento?.id) {
          console.error('Atendimento not found or created, skipping message');
          continue;
        }

        // Handle different message types
        if (messageType === 'text') {
          const messageBody = message.text?.body || '';

          if (messageBody) {
            const { data: novaMensagem, error: mensagemError } = await supabase
              .from('mensagens')
              .insert({
                atendimento_id: atendimento.id,
                conteudo: messageBody,
                remetente_tipo: 'cliente',
                remetente_id: null,
                created_at: timestamp,
                whatsapp_message_id: message.id,
              })
              .select()
              .single();

            if (mensagemError) {
              console.error('Error creating mensagem from WhatsApp (text):', mensagemError);
            } else {
              console.log('Mensagem de texto criada a partir do WhatsApp:', novaMensagem?.id);
            }
          }
        } else if (messageType === 'image' || messageType === 'document') {
          const media = message[messageType];
          const mediaId = media?.id;
          const mimeType: string | undefined = media?.mime_type;
          const caption: string = media?.caption || '';
          const filename: string | undefined = media?.filename;

          if (!mediaId) {
            console.error('Media message without media id, skipping');
          } else {
            const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
            if (!accessToken) {
              console.error('WHATSAPP_ACCESS_TOKEN not configured, cannot download media');
            } else {
              try {
                // Get media URL from WhatsApp Graph API
                const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                if (!metaRes.ok) {
                  const metaError = await metaRes.text();
                  console.error('Error fetching media metadata from WhatsApp:', metaError);
                  continue;
                }

                const metaData = await metaRes.json();
                const mediaUrl: string | undefined = metaData.url;

                if (!mediaUrl) {
                  console.error('No media URL returned from WhatsApp');
                  continue;
                }

                // Download media file
                const fileRes = await fetch(mediaUrl, {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                if (!fileRes.ok) {
                  const fileError = await fileRes.text();
                  console.error('Error downloading media from WhatsApp:', fileError);
                  continue;
                }

                const arrayBuffer = await fileRes.arrayBuffer();
                const fileBytes = new Uint8Array(arrayBuffer);

                const isImage = messageType === 'image';
                const fileExtension = filename?.split('.').pop() || (mimeType?.split('/')[1] ?? (isImage ? 'jpg' : 'bin'));
                const safeFileName = filename || `${messageType}-${mediaId}.${fileExtension}`;
                const storagePath = `${atendimento.id}/${Date.now()}-${safeFileName}`;

                const { error: uploadError } = await supabase.storage
                  .from('chat-files')
                  .upload(storagePath, fileBytes, {
                    contentType: mimeType || (isImage ? 'image/jpeg' : 'application/octet-stream'),
                  });

                if (uploadError) {
                  console.error('Error uploading media to Supabase storage:', uploadError);
                  continue;
                }

                const { data: publicData } = supabase.storage
                  .from('chat-files')
                  .getPublicUrl(storagePath);

                const publicUrl = publicData?.publicUrl;

                if (!publicUrl) {
                  console.error('Could not get public URL for media');
                  continue;
                }

                const attachmentType = isImage ? 'image' : 'document';

                const { data: novaMensagem, error: mensagemError } = await supabase
                  .from('mensagens')
                  .insert({
                    atendimento_id: atendimento.id,
                    conteudo: caption,
                    remetente_tipo: 'cliente',
                    remetente_id: null,
                    created_at: timestamp,
                    whatsapp_message_id: message.id,
                    attachment_url: publicUrl,
                    attachment_type: attachmentType,
                    attachment_filename: filename || safeFileName,
                  })
                  .select()
                  .single();

                if (mensagemError) {
                  console.error('Error creating mensagem from WhatsApp (media):', mensagemError);
                } else {
                  console.log('Mensagem de mídia criada a partir do WhatsApp:', novaMensagem?.id);
                }
              } catch (err) {
                console.error('Unexpected error while processing WhatsApp media:', err);
              }
            }
          }
        } else {
          console.log(`Ignoring unsupported WhatsApp message type: ${messageType}`);
        }
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
