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
      // First, check if there's a main number configured via environment secrets
      const mainAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const mainPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      
      let mainNumber = null;
      
      if (mainAccessToken && mainPhoneNumberId) {
        console.log('Found main number configured via secrets, validating...');
        try {
          const phoneInfoResponse = await fetch(
            `https://graph.facebook.com/v18.0/${mainPhoneNumberId}?fields=display_phone_number,verified_name`,
            {
              headers: {
                'Authorization': `Bearer ${mainAccessToken}`,
              },
            }
          );

          if (phoneInfoResponse.ok) {
            const phoneInfo = await phoneInfoResponse.json();
            mainNumber = {
              id: 'main-env-number',
              name: 'Número Principal (Secrets)',
              phone_number_id: mainPhoneNumberId,
              phone_display: phoneInfo.display_phone_number,
              verified_name: phoneInfo.verified_name,
              is_active: true,
              is_main: true, // Flag to identify main number
              created_at: null,
              updated_at: null,
            };
            console.log('Main number validated:', phoneInfo.display_phone_number);
          } else {
            console.log('Main number validation failed, secrets may be invalid');
          }
        } catch (err) {
          console.error('Error validating main number:', err);
        }
      }

      // List all Meta WhatsApp numbers from the database
      const { data, error } = await supabase
        .from('meta_whatsapp_numbers')
        .select('id, name, phone_number_id, phone_display, verified_name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Meta numbers:', error);
        throw error;
      }

      // Check if main number was already migrated to DB (by phone_number_id)
      const mainNumberAlreadyInDb = mainPhoneNumberId && data?.some(
        (n: { phone_number_id: string }) => n.phone_number_id === mainPhoneNumberId
      );

      // Only include main number from secrets if it's NOT already in the database
      const allNumbers = (mainNumber && !mainNumberAlreadyInDb) 
        ? [mainNumber, ...(data || [])] 
        : (data || []);
      
      console.log(`Found ${allNumbers.length} Meta numbers (including main: ${mainNumber ? 'yes' : 'no'})`);

      return new Response(
        JSON.stringify({ success: true, data: allNumbers }),
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

    if (action === 'migrate_main_number') {
      // Migrate the main number from secrets to the database for full management
      const mainAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const mainPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      
      if (!mainAccessToken || !mainPhoneNumberId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Número principal não está configurado nos secrets' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if already migrated
      const { data: existing } = await supabase
        .from('meta_whatsapp_numbers')
        .select('id')
        .eq('phone_number_id', mainPhoneNumberId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, message: 'Número já está no banco de dados', alreadyMigrated: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate with Meta API
      const phoneInfoResponse = await fetch(
        `https://graph.facebook.com/v18.0/${mainPhoneNumberId}?fields=display_phone_number,verified_name`,
        {
          headers: {
            'Authorization': `Bearer ${mainAccessToken}`,
          },
        }
      );

      if (!phoneInfoResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, message: 'Falha ao validar credenciais do número principal' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const phoneInfo = await phoneInfoResponse.json();

      // Save to database
      const { data, error } = await supabase
        .from('meta_whatsapp_numbers')
        .insert({
          name: 'Número Principal',
          phone_number_id: mainPhoneNumberId,
          access_token: mainAccessToken,
          business_account_id: Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID') || null,
          webhook_verify_token: Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || null,
          phone_display: phoneInfo.display_phone_number,
          verified_name: phoneInfo.verified_name,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error migrating main number:', error);
        throw error;
      }

      console.log('Main number migrated to database:', data.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Número principal migrado para o banco de dados! Agora pode ser gerenciado pela interface.',
          data: {
            id: data.id,
            name: data.name,
            phoneDisplay: phoneInfo.display_phone_number,
          }
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

      // Save credentials to database using service role
      const { data: existingConfig } = await supabase
        .from('evolution_config')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConfig) {
        await supabase
          .from('evolution_config')
          .update({
            api_url: apiUrl,
            api_key: apiKey,
            is_connected: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);
        console.log('Evolution config updated in database');
      } else {
        await supabase
          .from('evolution_config')
          .insert({
            api_url: apiUrl,
            api_key: apiKey,
            is_connected: true,
          });
        console.log('Evolution config created in database');
      }

      // Configure webhooks for all instances automatically
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?source=evolution`;
      console.log('Auto-configuring webhooks with URL:', webhookUrl);
      
      for (const instance of instances) {
        const instanceName = instance.name || instance.instanceName;
        if (!instanceName) continue;
        
        try {
          // Evolution API v2 uses different endpoint and structure
          const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
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
            }),
          });
          
          if (webhookResponse.ok) {
            console.log(`Webhook configured for instance: ${instanceName}`);
          } else {
            console.error(`Failed to configure webhook for ${instanceName}:`, await webhookResponse.text());
          }
        } catch (err) {
          console.error(`Error configuring webhook for ${instanceName}:`, err);
        }
      }

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
