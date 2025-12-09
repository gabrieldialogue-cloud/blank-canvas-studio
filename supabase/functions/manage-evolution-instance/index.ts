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
    const { action, evolutionApiUrl, evolutionApiKey, instanceData } = await req.json();
    console.log('Action:', action);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use provided credentials or fallback to stored secrets
    const apiUrl = evolutionApiUrl || Deno.env.get('EVOLUTION_API_URL');
    const apiKey = evolutionApiKey || Deno.env.get('EVOLUTION_API_KEY');

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Credenciais da Evolution API não configuradas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (action === 'list_instances') {
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`);
      }

      const instances = await response.json();
      console.log('Instances fetched:', instances.length || 0);

      return new Response(
        JSON.stringify({ success: true, instances }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_instance') {
      const { vendedorId, instanceName, phoneNumber } = instanceData;

      if (!vendedorId || !instanceName) {
        return new Response(
          JSON.stringify({ success: false, message: 'Vendedor e nome da instância são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // First, check if instance already exists
      console.log('Checking if instance already exists:', instanceName);
      const checkResponse = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      let instanceExists = false;
      let existingStatus = null;
      
      if (checkResponse.ok) {
        const statusData = await checkResponse.json();
        existingStatus = statusData.state || statusData.instance?.state;
        instanceExists = existingStatus !== 'not_found' && existingStatus !== undefined;
        console.log('Instance check result:', { instanceExists, existingStatus });
      }

      // If instance exists, just get QR code to reconnect
      if (instanceExists) {
        console.log('Instance already exists, attempting to connect:', instanceName);
        
        // Get QR Code for existing instance
        const qrResponse = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
          },
        });

        let qrCode = null;
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          qrCode = qrData.base64 || qrData.qrcode?.base64 || null;
        }

        // Update vendedor config
        const { error: dbError } = await supabase
          .from('config_vendedores')
          .update({
            evolution_instance_name: instanceName,
            evolution_phone_number: phoneNumber || null,
            evolution_status: existingStatus === 'open' ? 'connected' : 'pending_qr',
          })
          .eq('usuario_id', vendedorId);

        if (dbError) {
          console.error('Error updating vendedor config:', dbError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: existingStatus === 'open' 
              ? 'Instância já conectada!' 
              : 'Instância encontrada. Escaneie o QR Code para conectar.',
            instance: { instanceName, state: existingStatus },
            qrCode: qrCode,
            instanceName: instanceName,
            alreadyExists: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new instance in Evolution API
      console.log('Creating new instance:', instanceName);
      const createResponse = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          reject_call: true,
          msgCall: 'Não é possível atender chamadas neste número.',
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Error creating instance:', errorText);
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao criar instância: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const instanceResult = await createResponse.json();
      console.log('Instance created:', instanceResult);

      // Configure webhook for this instance
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?source=evolution`;
      console.log('Configuring webhook for new instance:', instanceName, 'URL:', webhookUrl);
      
      try {
        // Evolution API v2 format for webhook configuration
        const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              webhookBase64: true,
              events: [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
                'QRCODE_UPDATED',
              ],
            },
          }),
        });
        
        if (webhookResponse.ok) {
          console.log('Webhook configured successfully for', instanceName);
        } else {
          const webhookError = await webhookResponse.text();
          console.error('Error configuring webhook:', webhookError);
        }
      } catch (webhookErr) {
        console.error('Error configuring webhook:', webhookErr);
      }

      // Get QR Code
      const qrResponse = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      let qrCode = null;
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        qrCode = qrData.base64 || qrData.qrcode?.base64 || null;
      }

      // Store vendedor instance mapping in database
      const { error: dbError } = await supabase
        .from('config_vendedores')
        .update({
          evolution_instance_name: instanceName,
          evolution_phone_number: phoneNumber || null,
          evolution_status: 'pending_qr',
        })
        .eq('usuario_id', vendedorId);

      if (dbError) {
        console.error('Error updating vendedor config:', dbError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Instância criada com sucesso',
          instance: instanceResult.instance || instanceResult,
          qrCode: qrCode,
          instanceName: instanceName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_qr_code') {
      const { instanceName } = instanceData;

      const qrResponse = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao obter QR Code: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const qrData = await qrResponse.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          qrCode: qrData.base64 || qrData.qrcode?.base64 || null,
          pairingCode: qrData.pairingCode || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_instance_status') {
      const { instanceName, updateDatabase } = instanceData;

      const statusResponse = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        return new Response(
          JSON.stringify({ success: true, status: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();
      const state = statusData.state || statusData.instance?.state || 'unknown';
      
      // If updateDatabase is true, sync the status to config_vendedores
      if (updateDatabase && instanceName) {
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
        
        console.log(`Syncing status for ${instanceName}: Evolution state=${state}, DB status=${evolutionStatus}`);
        
        const { error: updateError } = await supabase
          .from('config_vendedores')
          .update({ evolution_status: evolutionStatus })
          .eq('evolution_instance_name', instanceName);
          
        if (updateError) {
          console.error('Error updating evolution_status:', updateError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          status: state,
          instance: statusData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_instance') {
      const { instanceName, vendedorId } = instanceData;

      // Try to delete from Evolution API
      const deleteResponse = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      // If 404, instance doesn't exist in Evolution - that's okay, we'll still clean up DB
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao deletar instância: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Clean up database - clear the evolution config from vendedor
      if (vendedorId) {
        const { error: dbError } = await supabase
          .from('config_vendedores')
          .update({
            evolution_instance_name: null,
            evolution_phone_number: null,
            evolution_status: 'disconnected',
          })
          .eq('usuario_id', vendedorId);

        if (dbError) {
          console.error('Error cleaning vendedor config:', dbError);
        }
      }

      console.log('Instance deleted:', instanceName, deleteResponse.status === 404 ? '(was already deleted from Evolution)' : '');

      return new Response(
        JSON.stringify({ success: true, message: 'Instância deletada com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'logout_instance') {
      const { instanceName } = instanceData;

      const logoutResponse = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!logoutResponse.ok) {
        const errorText = await logoutResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao desconectar instância: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Instance logged out:', instanceName);

      return new Response(
        JSON.stringify({ success: true, message: 'WhatsApp desconectado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'restart_instance') {
      const { instanceName } = instanceData;

      const restartResponse = await fetch(`${apiUrl}/instance/restart/${instanceName}`, {
        method: 'PUT',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!restartResponse.ok) {
        const errorText = await restartResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao reiniciar instância: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Instance restarted:', instanceName);

      return new Response(
        JSON.stringify({ success: true, message: 'Instância reiniciada com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'configure_webhook') {
      const { instanceName, webhookUrl } = instanceData;

      if (!instanceName || !webhookUrl) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância e URL do webhook são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Configuring webhook for instance:', instanceName, 'URL:', webhookUrl);

      // Configure webhook in Evolution API v2 format
      const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
            ],
          },
        }),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Error configuring webhook:', errorText);
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao configurar webhook: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const webhookResult = await webhookResponse.json();
      console.log('Webhook configured:', webhookResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook configurado com sucesso',
          webhook: webhookResult,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'configure_all_webhooks') {
      const { webhookUrl } = instanceData;

      if (!webhookUrl) {
        return new Response(
          JSON.stringify({ success: false, message: 'URL do webhook é obrigatória' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // First get all instances
      const instancesResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!instancesResponse.ok) {
        throw new Error(`Evolution API error: ${instancesResponse.status}`);
      }

      const instances = await instancesResponse.json();
      console.log('Found instances to configure webhook:', instances.length);

      const results: { instanceName: string; success: boolean; error?: string }[] = [];

      for (const instance of instances) {
        const instanceName = instance.name || instance.instanceName;
        if (!instanceName) continue;

        try {
          // Evolution API v2 format
          const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: webhookUrl,
                webhookByEvents: false,
                webhookBase64: true,
                events: [
                  'MESSAGES_UPSERT',
                  'MESSAGES_UPDATE',
                  'MESSAGES_DELETE',
                  'SEND_MESSAGE',
                  'CONNECTION_UPDATE',
                  'QRCODE_UPDATED',
                ],
              },
            }),
          });

          if (webhookResponse.ok) {
            results.push({ instanceName, success: true });
            console.log(`Webhook configured for ${instanceName}`);
          } else {
            const errorText = await webhookResponse.text();
            results.push({ instanceName, success: false, error: errorText });
            console.error(`Failed to configure webhook for ${instanceName}:`, errorText);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({ instanceName, success: false, error: errMsg });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Webhook configurado em ${successCount} de ${results.length} instância(s)`,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Error managing Evolution instance:', error);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
