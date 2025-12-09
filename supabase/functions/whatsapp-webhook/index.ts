import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle Evolution API webhooks
async function handleEvolutionWebhook(req: Request, supabase: SupabaseClient) {
  try {
    const body = await req.json();
    console.log('Received Evolution webhook:', JSON.stringify(body, null, 2));

    const event = body.event;
    const instanceName = body.instance;
    const data = body.data;

    console.log(`Evolution event: ${event} from instance: ${instanceName}`);

    // Handle different Evolution events
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      // In Evolution API v2, the structure is:
      // data.key contains: remoteJid, fromMe, id
      // data.message contains: conversation, imageMessage, etc.
      // data.pushName contains the contact name
      
      if (!data) {
        console.log('No data in Evolution webhook');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Skip messages sent by us (fromMe = true)
      if (data.key?.fromMe === true) {
        console.log('Skipping message sent by us');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone number from remoteJid - this is the CLIENT who sent the message
      // The key is in data.key, NOT in data.message.key
      // Support multiple formats: @s.whatsapp.net, @c.us, @lid (list/internal)
      const remoteJid = data.key?.remoteJid || '';
      
      // Skip group messages
      if (remoteJid.includes('@g.us')) {
        console.log('Skipping group message');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Extract phone number from remoteJid - this is the CLIENT's number
      // IMPORTANT: body.sender is the INSTANCE number (vendor's personal number), NOT the client!
      let from = remoteJid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@lid', '');
      
      // If remoteJid gave us an invalid number (like @lid format), skip this message
      // DO NOT use body.sender as it's the instance number, not the client
      if (!from || !/^\d+$/.test(from)) {
        console.log('Skipping message with invalid remoteJid:', remoteJid, 'extracted:', from);
        console.log('Note: body.sender is the instance number, not the client:', body.sender);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Valid Evolution message from CLIENT ${from} via instance ${instanceName}`);

      const messageId = data.key?.id || `evo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const pushName = data.pushName || '';
      const timestamp = data.messageTimestamp 
        ? new Date(parseInt(data.messageTimestamp) * 1000).toISOString() 
        : new Date().toISOString();

      console.log(`Evolution message from ${from} (${pushName}): ID ${messageId}`);

      // Find or create cliente
      let cliente;
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', from)
        .single();

      if (existingCliente) {
        cliente = existingCliente;
        
        // Update push_name if available
        if (pushName && existingCliente.nome.startsWith('Cliente ')) {
          await supabase
            .from('clientes')
            .update({ nome: pushName, push_name: pushName })
            .eq('id', existingCliente.id);
          cliente.nome = pushName;
        }
      } else {
        const clienteName = pushName || `Cliente ${from}`;
        const { data: newCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nome: clienteName,
            telefone: from,
            push_name: pushName || null,
          })
          .select()
          .single();

        if (clienteError) {
          console.error('Error creating cliente from Evolution:', clienteError);
          return new Response(JSON.stringify({ success: false, error: clienteError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        cliente = newCliente;
        console.log('New cliente created from Evolution:', cliente.id);
      }

      // Find or create atendimento
      // IMPORTANT: Keep Meta and Evolution atendimentos SEPARATE
      // Only look for existing Evolution atendimentos for this instance
      const { data: evolutionAtendimentos } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .eq('source', 'evolution')
        .eq('evolution_instance_name', instanceName)
        .neq('status', 'encerrado')
        .order('created_at', { ascending: false })
        .limit(1);

      let atendimento;
      if (evolutionAtendimentos && evolutionAtendimentos.length > 0) {
        // Reuse existing Evolution atendimento for this instance
        atendimento = evolutionAtendimentos[0];
        console.log(`Reusing existing Evolution atendimento ${atendimento.id} for instance ${instanceName}`);
      } else {
        // Find vendedor associated with this Evolution instance
        const { data: vendedorConfig } = await supabase
          .from('config_vendedores')
          .select('usuario_id')
          .eq('evolution_instance_name', instanceName)
          .single();

        const vendedorId = vendedorConfig?.usuario_id || null;

        const { data: newAtendimento, error: atendimentoError } = await supabase
          .from('atendimentos')
          .insert({
            cliente_id: cliente.id,
            marca_veiculo: 'A definir',
            status: 'ia_respondendo',
            vendedor_fixo_id: vendedorId,
            source: 'evolution',
            evolution_instance_name: instanceName,
          })
          .select()
          .single();

        if (atendimentoError) {
          console.error('Error creating atendimento from Evolution:', atendimentoError);
          return new Response(JSON.stringify({ success: false, error: atendimentoError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        atendimento = newAtendimento;
        console.log(`Atendimento created for Evolution instance ${instanceName}, vendedor: ${vendedorId}`);
      }

      // Extract message content based on type
      let messageContent = '';
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentFilename = null;

      const messageData = data.message || {};
      
      // Handle conversation type - may have messageContextInfo wrapper
      if (messageData.conversation) {
        messageContent = messageData.conversation;
      } else if (data.messageType === 'conversation' && messageData.conversation) {
        messageContent = messageData.conversation;
      } else if (messageData.extendedTextMessage?.text) {
        messageContent = messageData.extendedTextMessage.text;
      } else if (messageData.imageMessage) {
        messageContent = messageData.imageMessage.caption || '[Imagem]';
        attachmentType = 'image';
        // Handle base64 image if provided
        if (data.base64) {
          try {
            const base64Data = data.base64.split(',')[1] || data.base64;
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `image-${messageId}.jpg`;
            const storagePath = `${atendimento.id}/${Date.now()}-${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('chat-files')
              .upload(storagePath, binaryData, { contentType: 'image/jpeg' });
            
            if (!uploadError) {
              const { data: publicData } = supabase.storage.from('chat-files').getPublicUrl(storagePath);
              attachmentUrl = publicData?.publicUrl;
              attachmentFilename = fileName;
            }
          } catch (e) {
            console.error('Error processing Evolution image:', e);
          }
        }
      } else if (messageData.audioMessage) {
        messageContent = '[Áudio]';
        attachmentType = 'audio';
        if (data.base64) {
          try {
            const base64Data = data.base64.split(',')[1] || data.base64;
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `audio-${messageId}.ogg`;
            const storagePath = `${atendimento.id}/${Date.now()}-${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('chat-audios')
              .upload(storagePath, binaryData, { contentType: 'audio/ogg' });
            
            if (!uploadError) {
              const { data: publicData } = supabase.storage.from('chat-audios').getPublicUrl(storagePath);
              attachmentUrl = publicData?.publicUrl;
              attachmentFilename = fileName;
            }
          } catch (e) {
            console.error('Error processing Evolution audio:', e);
          }
        }
      } else if (messageData.documentMessage) {
        messageContent = messageData.documentMessage.fileName || '[Documento]';
        attachmentType = 'document';
        attachmentFilename = messageData.documentMessage.fileName;
        if (data.base64) {
          try {
            const base64Data = data.base64.split(',')[1] || data.base64;
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = messageData.documentMessage.fileName || `doc-${messageId}`;
            const storagePath = `${atendimento.id}/${Date.now()}-${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('chat-files')
              .upload(storagePath, binaryData, { contentType: messageData.documentMessage.mimetype || 'application/octet-stream' });
            
            if (!uploadError) {
              const { data: publicData } = supabase.storage.from('chat-files').getPublicUrl(storagePath);
              attachmentUrl = publicData?.publicUrl;
            }
          } catch (e) {
            console.error('Error processing Evolution document:', e);
          }
        }
      } else {
        // Try to extract text from any property
        const possibleTextKeys = ['text', 'body', 'caption'];
        for (const key of possibleTextKeys) {
          if (messageData[key]) {
            messageContent = messageData[key];
            break;
          }
        }
        
        if (!messageContent) {
          console.log('Unsupported Evolution message type:', Object.keys(messageData));
          messageContent = '[Mensagem não suportada]';
        }
      }

      // Check for duplicate message - only if we have a real messageId (not generated)
      if (messageId && !messageId.startsWith('evo-')) {
        const { data: existingMsg } = await supabase
          .from('mensagens')
          .select('id')
          .eq('whatsapp_message_id', messageId)
          .single();

        if (existingMsg) {
          console.log('Duplicate Evolution message, skipping:', messageId);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Insert message
      const { data: novaMensagem, error: mensagemError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: atendimento.id,
          conteudo: messageContent,
          remetente_tipo: 'cliente',
          remetente_id: null,
          created_at: timestamp,
          whatsapp_message_id: messageId,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_filename: attachmentFilename,
          source: 'evolution',
        })
        .select()
        .single();

      if (mensagemError) {
        console.error('Error creating mensagem from Evolution:', mensagemError);
      } else {
        console.log('Message created from Evolution:', novaMensagem?.id);
      }
    } else if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      // Handle connection status updates
      const state = data?.state || data?.status;
      console.log(`Evolution connection update for ${instanceName}: ${state}`);
      
      if (instanceName) {
        // Map Evolution states to our status values
        let evolutionStatus = 'disconnected';
        if (state === 'open' || state === 'connected') {
          evolutionStatus = 'connected';
        } else if (state === 'connecting') {
          evolutionStatus = 'connecting';
        } else if (state === 'close' || state === 'closed' || state === 'disconnected') {
          evolutionStatus = 'disconnected';
        } else if (state === 'pending_qr' || state === 'qrcode') {
          evolutionStatus = 'pending_qr';
        }
        
        console.log(`Updating config_vendedores for ${instanceName} with status: ${evolutionStatus}`);
        
        const { error: updateError } = await supabase
          .from('config_vendedores')
          .update({ evolution_status: evolutionStatus })
          .eq('evolution_instance_name', instanceName);
          
        if (updateError) {
          console.error('Error updating evolution_status:', updateError);
        } else {
          console.log(`Successfully updated ${instanceName} status to ${evolutionStatus}`);
        }
      }
    } else if (event === 'messages.update' || event === 'MESSAGES_UPDATE') {
      // Handle message status updates (delivered, read)
      const messageId = data?.keyId || data?.key?.id;
      const status = data?.status; // DELIVERY_ACK, READ, PLAYED
      const remoteJid = data?.remoteJid || data?.key?.remoteJid || '';
      
      console.log(`Evolution message status update: ${messageId} -> ${status}`);
      
      if (messageId && status) {
        // Find the message in our database
        const { data: mensagem } = await supabase
          .from('mensagens')
          .select('id, atendimento_id')
          .eq('whatsapp_message_id', messageId)
          .single();
        
        if (mensagem) {
          const updateData: any = {};
          
          if (status === 'DELIVERY_ACK' || status === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
            console.log(`Message ${messageId} delivered`);
          } else if (status === 'READ' || status === 'read' || status === 'PLAYED') {
            updateData.read_at = new Date().toISOString();
            updateData.delivered_at = updateData.delivered_at || new Date().toISOString();
            console.log(`Message ${messageId} read`);
          }
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('mensagens')
              .update(updateData)
              .eq('id', mensagem.id);
          }
          
          // Broadcast client presence (they're online if reading/receiving)
          if (mensagem.atendimento_id) {
            const channel = supabase.channel('global-client-presence');
            await channel.send({
              type: 'broadcast',
              event: 'client_online',
              payload: {
                atendimentoId: mensagem.atendimento_id,
                isOnline: true,
                source: 'evolution'
              }
            });
            console.log(`Broadcast client online for atendimento ${mensagem.atendimento_id}`);
          }
        }
      }
    } else if (event === 'presence.update' || event === 'PRESENCE_UPDATE') {
      // Handle presence updates (online, offline, composing)
      const remoteJid = data?.id || data?.remoteJid || '';
      const presences = data?.presences || {};
      
      // Extract phone number from remoteJid
      const phoneNumber = remoteJid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '');
      
      console.log(`Evolution presence update for ${phoneNumber}:`, presences);
      
      if (phoneNumber && !/^\d+$/.test(phoneNumber) === false) {
        // Find cliente by phone
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', phoneNumber)
          .single();
        
        if (cliente) {
          // Find active atendimentos for this client with Evolution source
          const { data: atendimentos } = await supabase
            .from('atendimentos')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('source', 'evolution')
            .eq('evolution_instance_name', instanceName)
            .neq('status', 'encerrado');
          
          if (atendimentos && atendimentos.length > 0) {
            // Get the presence status
            const presenceInfo = presences[remoteJid] || {};
            const lastKnownPresence = presenceInfo.lastKnownPresence || '';
            const isComposing = lastKnownPresence === 'composing';
            const isOnline = lastKnownPresence === 'available' || isComposing;
            
            console.log(`Client ${phoneNumber} presence: ${lastKnownPresence}, online: ${isOnline}, composing: ${isComposing}`);
            
            for (const atendimento of atendimentos) {
              const channel = supabase.channel('global-client-presence');
              await channel.send({
                type: 'broadcast',
                event: 'client_online',
                payload: {
                  atendimentoId: atendimento.id,
                  isOnline: isOnline,
                  source: 'evolution'
                }
              });
              
              // Also broadcast typing if composing
              if (isComposing) {
                const typingChannel = supabase.channel(`client-presence:${atendimento.id}`);
                await typingChannel.send({
                  type: 'broadcast',
                  event: 'client_typing',
                  payload: { isTyping: true }
                });
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing Evolution webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

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
      const url = new URL(req.url);
      const source = url.searchParams.get('source');
      
      // Check if this is from Evolution API
      if (source === 'evolution') {
        return await handleEvolutionWebhook(req, supabase);
      }
      
      // Otherwise, handle Meta WhatsApp webhook
      const body = await req.json();
      console.log('Received Meta webhook:', JSON.stringify(body, null, 2));

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
          
          // Cache de foto: só buscar se não foi buscada nos últimos 7 dias ou se não existe
          const shouldFetchPhoto = !existingCliente.profile_picture_url || 
            !existingCliente.profile_picture_fetched_at ||
            (new Date().getTime() - new Date(existingCliente.profile_picture_fetched_at).getTime()) > 7 * 24 * 60 * 60 * 1000;
          
          // Se não tiver foto no payload e deve buscar, buscar através da API do WhatsApp
          if (!profilePicture && shouldFetchPhoto) {
            const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
            const waId = value?.contacts?.[0]?.wa_id || from;
            
            if (accessToken && waId) {
              try {
                console.log(`🔍 Buscando foto de perfil para ${waId} (cache expirado ou inexistente)`);
                const contactRes = await fetch(
                  `https://graph.facebook.com/v21.0/${waId}?fields=profile_pic`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                    }
                  }
                );
                
                console.log(`📊 Status da requisição de foto: ${contactRes.status}`);
                
                if (contactRes.ok) {
                  const contactData = await contactRes.json();
                  profilePicture = contactData?.profile_pic;
                  console.log(`✅ Foto de perfil obtida:`, profilePicture ? 'URL válida' : 'Nenhuma foto disponível');
                  console.log(`📸 URL completa:`, profilePicture);
                } else {
                  const errorText = await contactRes.text();
                  console.error(`❌ Erro ao buscar foto de perfil (status ${contactRes.status}):`, errorText);
                }
              } catch (err) {
                console.error('❌ Erro ao buscar foto de perfil (exception):', err);
              }
            } else {
              console.warn('⚠️ Não foi possível buscar foto: accessToken ou waId ausente');
            }
          } else if (!profilePicture && !shouldFetchPhoto) {
            console.log('⏭️ Pulando busca de foto (cache ainda válido)');
          }
          
          const updates: any = {};
          if (profileName && existingCliente.nome.startsWith('Cliente ')) {
            updates.nome = profileName;
          }
          if (profileName) {
            updates.push_name = profileName;
          }
          
          // Atualizar foto e timestamp de cache
          if (profilePicture && (!existingCliente.profile_picture_url || existingCliente.profile_picture_url !== profilePicture)) {
            updates.profile_picture_url = profilePicture;
            updates.profile_picture_fetched_at = new Date().toISOString();
          } else if (shouldFetchPhoto && !profilePicture) {
            // Marca que tentamos buscar (para não tentar novamente logo em seguida)
            updates.profile_picture_fetched_at = new Date().toISOString();
          }
          
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('clientes')
              .update(updates)
              .eq('id', existingCliente.id);
            
            if (updateError) {
              console.error('❌ Erro ao atualizar cliente:', updateError);
            } else {
              cliente = { ...existingCliente, ...updates };
              console.log('✅ Cliente atualizado:', updates);
            }
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
                console.log(`🔍 Buscando foto de perfil para novo cliente ${waId}`);
                const contactRes = await fetch(
                  `https://graph.facebook.com/v21.0/${waId}?fields=profile_pic`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                    }
                  }
                );
                
                console.log(`📊 Status da requisição de foto (novo cliente): ${contactRes.status}`);
                
                if (contactRes.ok) {
                  const contactData = await contactRes.json();
                  profilePicture = contactData?.profile_pic;
                  console.log(`✅ Foto obtida para novo cliente:`, profilePicture ? 'URL válida' : 'Nenhuma foto');
                  console.log(`📸 URL completa:`, profilePicture);
                } else {
                  const errorText = await contactRes.text();
                  console.error(`❌ Erro ao buscar foto (novo cliente - status ${contactRes.status}):`, errorText);
                }
              } catch (err) {
                console.error('❌ Erro ao buscar foto (novo cliente - exception):', err);
              }
            } else {
              console.warn('⚠️ Não foi possível buscar foto: accessToken ou waId ausente');
            }
          }
          
          const { data: newCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert({
              nome: profileName,
              telefone: from,
              push_name: profileName,
              profile_picture_url: profilePicture || null,
              profile_picture_fetched_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (clienteError) {
            console.error('❌ Erro ao criar cliente:', clienteError);
            continue;
          }
          cliente = newCliente;
          console.log('✅ Novo cliente criado. Foto:', profilePicture ? 'Sim' : 'Não');
        }

        // Find or create atendimento
        // IMPORTANT: Only look for META atendimentos (source = 'meta' or NULL)
        // Evolution atendimentos are completely separate
        const { data: metaAtendimentos } = await supabase
          .from('atendimentos')
          .select('*')
          .eq('cliente_id', cliente.id)
          .neq('status', 'encerrado')
          .or('source.eq.meta,source.is.null')
          .order('created_at', { ascending: false })
          .limit(1);

        let atendimento;
        if (metaAtendimentos && metaAtendimentos.length > 0) {
          atendimento = metaAtendimentos[0];
          console.log(`Reusing existing Meta atendimento ${atendimento.id}`);
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
              source: 'meta',
            })
            .select()
            .single();

          if (atendimentoError) {
            console.error('Error creating atendimento:', atendimentoError);
            continue;
          }
          atendimento = newAtendimento;
          console.log(`New Meta atendimento created and assigned to vendedor: ${vendedorId}`);
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
                source: 'meta',
              })
              .select()
              .single();

            if (mensagemError) {
              console.error('Error creating mensagem from WhatsApp (text):', mensagemError);
            } else {
              console.log('Mensagem de texto criada a partir do WhatsApp:', novaMensagem?.id);
            }
          }
        } else if (messageType === 'image' || messageType === 'document' || messageType === 'audio') {
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
                const isAudio = messageType === 'audio';
                const fileExtension = filename?.split('.').pop() || (mimeType?.split('/')[1] ?? (isImage ? 'jpg' : isAudio ? 'ogg' : 'bin'));
                const safeFileName = filename || `${messageType}-${mediaId}.${fileExtension}`;
                
                // Use appropriate bucket based on media type
                const bucketName = isAudio ? 'chat-audios' : 'chat-files';
                const storagePath = `${atendimento.id}/${Date.now()}-${safeFileName}`;

                const { error: uploadError } = await supabase.storage
                  .from(bucketName)
                  .upload(storagePath, fileBytes, {
                    contentType: mimeType || (isImage ? 'image/jpeg' : isAudio ? 'audio/ogg' : 'application/octet-stream'),
                  });

                if (uploadError) {
                  console.error('Error uploading media to Supabase storage:', uploadError);
                  continue;
                }

                const { data: publicData } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(storagePath);

                const publicUrl = publicData?.publicUrl;

                if (!publicUrl) {
                  console.error('Could not get public URL for media');
                  continue;
                }

                const attachmentType = isImage ? 'image' : isAudio ? 'audio' : 'document';
                
                // Initial content
                let messageContent = isAudio ? '[Áudio]' : (caption || `[${messageType}]`);

                const { data: novaMensagem, error: mensagemError } = await supabase
                  .from('mensagens')
                  .insert({
                    atendimento_id: atendimento.id,
                    conteudo: messageContent,
                    remetente_tipo: 'cliente',
                    remetente_id: null,
                    created_at: timestamp,
                    whatsapp_message_id: message.id,
                    attachment_url: publicUrl,
                    attachment_type: attachmentType,
                    attachment_filename: filename || safeFileName,
                    source: 'meta',
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
