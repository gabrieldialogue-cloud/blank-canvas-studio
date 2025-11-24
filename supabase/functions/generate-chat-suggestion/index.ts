import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { atendimentoId } = await req.json();
    
    if (!atendimentoId) {
      return new Response(
        JSON.stringify({ error: 'atendimentoId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar mensagens do atendimento
    const { data: mensagens, error: msgError } = await supabase
      .from('mensagens')
      .select('conteudo, remetente_tipo, created_at')
      .eq('atendimento_id', atendimentoId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Erro ao buscar mensagens:', msgError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar mensagens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mensagens || mensagens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma mensagem encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações do atendimento
    const { data: atendimento, error: atendError } = await supabase
      .from('atendimentos')
      .select(`
        marca_veiculo,
        modelo_veiculo,
        ano_veiculo,
        resumo_necessidade,
        clientes (nome)
      `)
      .eq('id', atendimentoId)
      .single();

    if (atendError) {
      console.error('Erro ao buscar atendimento:', atendError);
    }

    // Montar contexto da conversa
    const historico = mensagens.map(m => 
      `${m.remetente_tipo === 'cliente' ? 'Cliente' : 'Atendente'}: ${m.conteudo}`
    ).join('\n');

    const ultimaMensagemCliente = mensagens
      .filter(m => m.remetente_tipo === 'cliente')
      .pop();

    if (!ultimaMensagemCliente) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma mensagem do cliente encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar prompt para a IA
    const contexto = atendimento ? `
Cliente: ${(atendimento.clientes as any)?.nome || 'Não informado'}
Veículo: ${atendimento.marca_veiculo} ${atendimento.modelo_veiculo || ''} ${atendimento.ano_veiculo || ''}
Necessidade: ${atendimento.resumo_necessidade || 'Não especificada'}
` : '';

    const systemPrompt = `Você é um assistente especializado em atendimento automotivo. Sua função é sugerir respostas profissionais, claras e úteis para supervisores de vendas de peças automotivas.

${contexto}

Histórico da conversa:
${historico}

Com base no histórico e na última mensagem do cliente, gere uma resposta sugerida profissional e apropriada. A resposta deve ser:
- Clara e objetiva
- Profissional mas amigável
- Focada em resolver a necessidade do cliente
- Com no máximo 3-4 frases

Não inclua saudações como "Olá" se já houve interação anterior. Vá direto ao ponto da resposta.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não disponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Última mensagem do cliente: "${ultimaMensagemCliente.conteudo}"\n\nGere uma resposta sugerida apropriada.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taxa excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao gerar sugestão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices?.[0]?.message?.content;

    if (!suggestion) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma sugestão gerada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função generate-chat-suggestion:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});