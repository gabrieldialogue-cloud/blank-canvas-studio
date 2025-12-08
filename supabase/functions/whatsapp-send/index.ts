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
      source, // 'meta' or 'evolution'
      evolutionInstanceName,
      atendimentoId,
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

    // Determine which API to use
    let useEvolution = source === 'evolution';
    
    // If evolution instance is specified, check if Evolution is configured
    if (evolutionInstanceName || source === 'evolution') {
      const { data: evolutionConfig } = await supabase
        .from('evolution_config')
        .select('*')
        .eq('is_connected', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (evolutionConfig) {
        useEvolution = true;
      }
    }

    if (useEvolution) {
      // Send via Evolution API
      return await sendViaEvolution(supabase, { 
        to, message, audioUrl, mediaType, mediaUrl, filename, caption, evolutionInstanceName, atendimentoId 
      });
    } else {
      // Send via Meta WhatsApp API
      return await sendViaMeta({ to, message, audioUrl, mediaType, mediaUrl, filename, caption });
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
  { to, message, audioUrl, mediaType, mediaUrl, filename, caption, evolutionInstanceName, atendimentoId }: any
) {
  console.log('Sending via Evolution API');
  
  // Get Evolution config
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

  // If no instance name provided, try to find from atendimento's vendedor
  let instanceName = evolutionInstanceName;
  if (!instanceName && atendimentoId) {
    const { data: atendimento } = await supabase
      .from('atendimentos')
      .select('vendedor_fixo_id')
      .eq('id', atendimentoId)
      .single();

    if (atendimento?.vendedor_fixo_id) {
      const { data: vendedorConfig } = await supabase
        .from('config_vendedores')
        .select('evolution_instance_name')
        .eq('usuario_id', atendimento.vendedor_fixo_id)
        .single();

      instanceName = vendedorConfig?.evolution_instance_name;
    }
  }

  // If still no instance, get the first available instance
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

  // Format phone number for Evolution (with @s.whatsapp.net)
  const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;

  let endpoint = '';
  let payload: any = {};

  if (audioUrl) {
    // Send audio
    endpoint = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
    payload = {
      number: formattedTo.replace('@s.whatsapp.net', ''),
      audio: audioUrl,
      delay: 1000,
      encoding: true, // PTT (push to talk)
    };
    console.log('Sending audio via Evolution:', endpoint);
  } else if (mediaUrl && mediaType === 'image') {
    // Send image
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = {
      number: formattedTo.replace('@s.whatsapp.net', ''),
      mediatype: 'image',
      media: mediaUrl,
      caption: caption || '',
    };
    console.log('Sending image via Evolution:', endpoint);
  } else if (mediaUrl && mediaType === 'document') {
    // Send document
    endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
    payload = {
      number: formattedTo.replace('@s.whatsapp.net', ''),
      mediatype: 'document',
      media: mediaUrl,
      caption: caption || '',
      fileName: filename || 'document',
    };
    console.log('Sending document via Evolution:', endpoint);
  } else {
    // Send text
    endpoint = `${apiUrl}/message/sendText/${instanceName}`;
    payload = {
      number: formattedTo.replace('@s.whatsapp.net', ''),
      text: message,
      delay: 1000,
    };
    console.log('Sending text via Evolution:', endpoint);
  }

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

  // Extract message ID from Evolution response
  const messageId = responseData.key?.id || responseData.messageId || responseData.id;

  return new Response(
    JSON.stringify({ success: true, messageId, source: 'evolution' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendViaMeta({ to, message, audioUrl, mediaType, mediaUrl, filename, caption }: any) {
  console.log('Sending via Meta WhatsApp API');
  
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

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
    payload.audio = {
      link: audioUrl,
      voice: true,
    };
  } else if (mediaUrl && mediaType === 'image') {
    payload.type = 'image';
    payload.image = {
      link: mediaUrl,
    };
    if (caption) {
      payload.image.caption = caption;
    }
  } else if (mediaUrl && mediaType === 'document') {
    payload.type = 'document';
    payload.document = {
      link: mediaUrl,
      filename: filename || 'document',
    };
    if (caption) {
      payload.document.caption = caption;
    }
  } else {
    payload.type = 'text';
    payload.text = {
      body: message,
    };
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
