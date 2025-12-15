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
    const { 
      to, 
      message, 
      audioUrl, 
      mediaType, 
      mediaUrl, 
      filename, 
      caption,
      atendimentoId,
      whatsappNumberId, // ID from whatsapp_numbers table
    } = await req.json();

    if (!to || (!message && !audioUrl && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and (message, audioUrl, or mediaUrl)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which number config to use
    let numberConfig: any = null;

    // Priority 1: Explicit whatsappNumberId provided
    if (whatsappNumberId) {
      const { data } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', whatsappNumberId)
        .eq('is_active', true)
        .single();
      
      if (data) {
        numberConfig = data;
        console.log(`Using explicit whatsapp_number: ${data.name} (${data.api_type})`);
      }
    }

    // Priority 2: Look up from atendimento
    if (!numberConfig && atendimentoId) {
      const { data: atendimento } = await supabase
        .from('atendimentos')
        .select('whatsapp_number_id, number_type, source, evolution_instance_name, vendedor_fixo_id')
        .eq('id', atendimentoId)
        .single();

      if (atendimento?.whatsapp_number_id) {
        const { data } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('id', atendimento.whatsapp_number_id)
          .eq('is_active', true)
          .single();
        
        if (data) {
          numberConfig = data;
          console.log(`Using atendimento's whatsapp_number: ${data.name} (${data.api_type})`);
        }
      }

      // Fallback: Try to find by number_type and vendedor_id (for personal numbers)
      if (!numberConfig && atendimento?.number_type === 'pessoal' && atendimento.vendedor_fixo_id) {
        const { data } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('number_type', 'pessoal')
          .eq('vendedor_id', atendimento.vendedor_fixo_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          numberConfig = data;
          console.log(`Using vendedor's personal number: ${data.name} (${data.api_type})`);
        }
      }

      // Legacy fallback: Use evolution_instance_name from atendimento
      if (!numberConfig && atendimento?.evolution_instance_name) {
        const { data } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('api_type', 'evolution')
          .eq('evolution_instance_name', atendimento.evolution_instance_name)
          .eq('is_active', true)
          .single();
        
        if (data) {
          numberConfig = data;
          console.log(`Using legacy evolution instance: ${data.name}`);
        }
      }
    }

    // Priority 3: Use first active principal number
    if (!numberConfig) {
      const { data } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('number_type', 'principal')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (data) {
        numberConfig = data;
        console.log(`Using default principal number: ${data.name} (${data.api_type})`);
      }
    }

    // Fallback to legacy environment variables (for backward compatibility)
    if (!numberConfig) {
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      
      if (accessToken && phoneNumberId) {
        console.log('Using legacy environment variables for Meta API');
        return await sendViaMeta({ to, message, audioUrl, mediaType, mediaUrl, filename, caption }, accessToken, phoneNumberId);
      }
      
      // Try evolution_config as last resort
      const { data: evolutionConfig } = await supabase
        .from('evolution_config')
        .select('*')
        .eq('is_connected', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (evolutionConfig) {
        console.log('Using legacy evolution_config');
        return await sendViaEvolutionLegacy(supabase, { to, message, audioUrl, mediaType, mediaUrl, filename, caption, atendimentoId }, evolutionConfig);
      }

      return new Response(
        JSON.stringify({ error: 'Nenhum número WhatsApp configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via the appropriate API based on number config
    if (numberConfig.api_type === 'evolution') {
      return await sendViaEvolution(supabase, { to, message, audioUrl, mediaType, mediaUrl, filename, caption }, numberConfig);
    } else {
      return await sendViaMeta({ to, message, audioUrl, mediaType, mediaUrl, filename, caption }, numberConfig.access_token, numberConfig.phone_number_id);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendViaEvolution(
  supabase: any, 
  { to, message, audioUrl, mediaType, mediaUrl, filename, caption }: any,
  numberConfig: any
) {
  console.log('Sending via Evolution API using number config:', numberConfig.name);
  
  // Get Evolution API credentials
  const { data: evolutionConfig, error: configError } = await supabase
    .from('evolution_config')
    .select('*')
    .eq('is_connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (configError || !evolutionConfig) {
    console.error('Evolution not configured:', configError);
    return new Response(
      JSON.stringify({ error: 'Evolution API não configurada' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = evolutionConfig.api_url;
  const apiKey = evolutionConfig.api_key;
  const instanceName = numberConfig.evolution_instance_name;

  if (!instanceName) {
    return new Response(
      JSON.stringify({ error: 'Instância Evolution não configurada para este número' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Format phone number for Evolution
  const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  const phoneNumber = formattedTo.replace('@s.whatsapp.net', '');

  let endpoint = '';
  let payload: any = {};

  if (audioUrl) {
    endpoint = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
    payload = {
      number: phoneNumber,
      audio: audioUrl,
      delay: 1000,
      encoding: true,
    };
  } else if (mediaUrl && mediaType === 'image') {
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = {
      number: phoneNumber,
      mediatype: 'image',
      media: mediaUrl,
      caption: caption || '',
    };
  } else if (mediaUrl && mediaType === 'document') {
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = {
      number: phoneNumber,
      mediatype: 'document',
      media: mediaUrl,
      caption: caption || '',
      fileName: filename || 'document',
    };
  } else {
    endpoint = `${apiUrl}/message/sendText/${instanceName}`;
    payload = {
      number: phoneNumber,
      text: message,
      delay: 1000,
    };
  }

  console.log('Sending to Evolution:', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('Evolution API error:', responseData);
    return new Response(
      JSON.stringify({ error: 'Falha ao enviar mensagem via Evolution', details: responseData }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Message sent via Evolution:', responseData);

  const messageId = responseData.key?.id || responseData.messageId || responseData.id;

  return new Response(
    JSON.stringify({ success: true, messageId, source: 'evolution', numberType: numberConfig.number_type }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Legacy function for backward compatibility with evolution_config
async function sendViaEvolutionLegacy(
  supabase: any, 
  { to, message, audioUrl, mediaType, mediaUrl, filename, caption, atendimentoId }: any,
  evolutionConfig: any
) {
  console.log('Sending via Evolution API (legacy mode)');
  
  const apiUrl = evolutionConfig.api_url;
  const apiKey = evolutionConfig.api_key;

  // Try to find instance name from atendimento's vendedor
  let instanceName = null;
  if (atendimentoId) {
    const { data: atendimento } = await supabase
      .from('atendimentos')
      .select('vendedor_fixo_id, evolution_instance_name')
      .eq('id', atendimentoId)
      .single();

    if (atendimento?.evolution_instance_name) {
      instanceName = atendimento.evolution_instance_name;
    } else if (atendimento?.vendedor_fixo_id) {
      const { data: vendedorConfig } = await supabase
        .from('config_vendedores')
        .select('evolution_instance_name')
        .eq('usuario_id', atendimento.vendedor_fixo_id)
        .single();

      instanceName = vendedorConfig?.evolution_instance_name;
    }
  }

  // If still no instance, get the first available
  if (!instanceName) {
    try {
      const instancesRes = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { 'apikey': apiKey },
      });
      if (instancesRes.ok) {
        const instances = await instancesRes.json();
        if (instances.length > 0) {
          instanceName = instances[0].name || instances[0].instanceName;
        }
      }
    } catch (e) {
      console.error('Error fetching Evolution instances:', e);
    }
  }

  if (!instanceName) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma instância Evolution disponível' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  const phoneNumber = formattedTo.replace('@s.whatsapp.net', '');

  let endpoint = '';
  let payload: any = {};

  if (audioUrl) {
    endpoint = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
    payload = { number: phoneNumber, audio: audioUrl, delay: 1000, encoding: true };
  } else if (mediaUrl && mediaType === 'image') {
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = { number: phoneNumber, mediatype: 'image', media: mediaUrl, caption: caption || '' };
  } else if (mediaUrl && mediaType === 'document') {
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = { number: phoneNumber, mediatype: 'document', media: mediaUrl, caption: caption || '', fileName: filename || 'document' };
  } else {
    endpoint = `${apiUrl}/message/sendText/${instanceName}`;
    payload = { number: phoneNumber, text: message, delay: 1000 };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: 'Falha ao enviar mensagem via Evolution', details: responseData }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const messageId = responseData.key?.id || responseData.messageId || responseData.id;

  return new Response(
    JSON.stringify({ success: true, messageId, source: 'evolution' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendViaMeta({ to, message, audioUrl, mediaType, mediaUrl, filename, caption }: any, accessToken: string, phoneNumberId: string) {
  console.log('Sending via Meta WhatsApp API');

  if (!accessToken || !phoneNumberId) {
    return new Response(
      JSON.stringify({ error: 'WhatsApp credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const messageType = audioUrl ? 'audio' : (mediaUrl ? mediaType : 'text');
  console.log(`Sending ${messageType} to ${to}`);

  let payload: any = {
    messaging_product: 'whatsapp',
    to: to,
  };

  if (audioUrl) {
    payload.type = 'audio';
    payload.audio = { link: audioUrl, voice: true };
  } else if (mediaUrl && mediaType === 'image') {
    payload.type = 'image';
    payload.image = { link: mediaUrl };
    if (caption) payload.image.caption = caption;
  } else if (mediaUrl && mediaType === 'document') {
    payload.type = 'document';
    payload.document = { link: mediaUrl, filename: filename || 'document' };
    if (caption) payload.document.caption = caption;
  } else {
    payload.type = 'text';
    payload.text = { body: message };
  }

  const whatsappResponse = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const responseData = await whatsappResponse.json();

  if (!whatsappResponse.ok) {
    console.error('WhatsApp API error:', responseData);
    return new Response(
      JSON.stringify({ error: 'Failed to send message', details: responseData }),
      { status: whatsappResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Message sent successfully:', responseData);

  return new Response(
    JSON.stringify({ success: true, messageId: responseData.messages?.[0]?.id, source: 'meta' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
