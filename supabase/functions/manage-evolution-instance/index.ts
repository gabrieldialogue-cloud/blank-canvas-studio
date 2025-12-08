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
      const { instanceName } = instanceData;

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
      
      return new Response(
        JSON.stringify({
          success: true,
          status: statusData.state || statusData.instance?.state || 'unknown',
          instance: statusData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_instance') {
      const { instanceName } = instanceData;

      const deleteResponse = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Erro ao deletar instância: ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Instance deleted:', instanceName);

      return new Response(
        JSON.stringify({ success: true, message: 'Instância deletada com sucesso' }),
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
