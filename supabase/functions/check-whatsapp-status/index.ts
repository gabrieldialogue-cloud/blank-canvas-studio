import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const webhookToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    // Check if credentials are configured
    const hasCredentials = !!(accessToken && phoneNumberId);

    if (!hasCredentials) {
      console.log('WhatsApp credentials not configured');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'disconnected',
          message: 'Credenciais não configuradas',
          configured: {
            accessToken: !!accessToken,
            phoneNumberId: !!phoneNumberId,
            businessAccountId: !!businessAccountId,
            webhookToken: !!webhookToken,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection by fetching phone number info from Meta API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('WhatsApp connection verified:', data.display_phone_number || 'OK');
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'connected',
          message: 'Conexão verificada com sucesso',
          phoneNumber: data.display_phone_number || null,
          verifiedName: data.verified_name || null,
          configured: {
            accessToken: true,
            phoneNumberId: true,
            businessAccountId: !!businessAccountId,
            webhookToken: !!webhookToken,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await response.json();
      console.error('WhatsApp API error:', errorData);
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'error',
          message: errorData.error?.message || 'Erro ao verificar conexão',
          configured: {
            accessToken: true,
            phoneNumberId: true,
            businessAccountId: !!businessAccountId,
            webhookToken: !!webhookToken,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Error checking WhatsApp status:', error);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        message: errorMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
