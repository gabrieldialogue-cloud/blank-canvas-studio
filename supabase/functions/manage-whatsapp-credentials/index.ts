import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, credentials, numberId } = await req.json();

    console.log(`Processing action: ${action}`);

    if (action === 'list_meta_numbers') {
      // List all Meta WhatsApp numbers from the database
      const { data, error } = await supabase
        .from('meta_whatsapp_numbers')
        .select('id, name, phone_number_id, phone_display, verified_name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Meta numbers:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} Meta numbers`);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_meta_credentials') {
      const { name, accessToken, phoneNumberId, businessAccountId, webhookToken } = credentials;
      
      if (!accessToken || !phoneNumberId || !name) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome, Access Token e Phone Number ID são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Validate credentials with Meta API
      console.log('Validating Meta credentials for:', name);
      
      const phoneInfoResponse = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!phoneInfoResponse.ok) {
        const errorData = await phoneInfoResponse.json();
        console.error('Meta API error:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Falha na validação: ${errorData.error?.message || 'Credenciais inválidas'}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const phoneInfo = await phoneInfoResponse.json();
      console.log('Phone info:', phoneInfo);

      // Save to database
      const { data, error } = await supabase
        .from('meta_whatsapp_numbers')
        .insert({
          name: name,
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          business_account_id: businessAccountId || null,
          webhook_verify_token: webhookToken || null,
          phone_display: phoneInfo.display_phone_number,
          verified_name: phoneInfo.verified_name,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving Meta number:', error);
        throw error;
      }

      console.log('Meta number saved successfully:', data.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Número ${phoneInfo.verified_name || phoneInfo.display_phone_number} cadastrado com sucesso!`,
          data: {
            id: data.id,
            name: data.name,
            phoneNumber: phoneInfo.display_phone_number,
            verifiedName: phoneInfo.verified_name,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_meta_number') {
      if (!numberId) {
        return new Response(
          JSON.stringify({ success: false, message: 'ID do número é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error } = await supabase
        .from('meta_whatsapp_numbers')
        .delete()
        .eq('id', numberId);

      if (error) {
        console.error('Error deleting Meta number:', error);
        throw error;
      }

      console.log('Meta number deleted:', numberId);

      return new Response(
        JSON.stringify({ success: true, message: 'Número removido com sucesso!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle_meta_number_status') {
      if (!numberId) {
        return new Response(
          JSON.stringify({ success: false, message: 'ID do número é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('meta_whatsapp_numbers')
        .select('is_active')
        .eq('id', numberId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('meta_whatsapp_numbers')
        .update({ is_active: !current.is_active })
        .eq('id', numberId)
        .select()
        .single();

      if (error) throw error;

      console.log('Meta number status toggled:', numberId, '-> is_active:', data.is_active);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Número ${data.is_active ? 'ativado' : 'desativado'} com sucesso!`,
          isActive: data.is_active 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_evolution_credentials') {
      const { apiUrl, apiKey } = credentials;
      
      if (!apiUrl || !apiKey) {
        return new Response(
          JSON.stringify({ success: false, message: 'URL e API Key são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Validate Evolution API connection
      console.log('Validating Evolution API connection:', apiUrl);
      
      const instancesResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
        },
      });

      if (!instancesResponse.ok) {
        console.error('Evolution API validation failed');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Falha na conexão com Evolution API. Verifique URL e API Key.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const instances = await instancesResponse.json();
      const instancesCount = Array.isArray(instances) ? instances.length : 0;
      
      console.log('Evolution API connected. Instances count:', instancesCount);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Conectado à Evolution API com sucesso! ${instancesCount} instância(s) encontrada(s).`,
          instancesCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error in manage-whatsapp-credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
