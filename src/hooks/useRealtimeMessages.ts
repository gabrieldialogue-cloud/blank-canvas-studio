import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  atendimento_id: string;
  remetente_id: string | null;
  remetente_tipo: string;
  conteudo: string;
  created_at: string;
  read_at: string | null;
  read_by_id: string | null;
  delivered_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_filename: string | null;
  whatsapp_message_id: string | null;
  status?: 'enviando' | 'enviada' | 'entregue' | 'lida';
}

interface UseRealtimeMessagesProps {
  atendimentoId: string | null;
  vendedorId: string | null;
  enabled: boolean;
}

export function useRealtimeMessages({ 
  atendimentoId, 
  vendedorId,
  enabled 
}: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClientTyping, setIsClientTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar mensagens do banco
  const fetchMessages = useCallback(async (atendId: string, silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      console.log('📥 Buscando mensagens do atendimento:', atendId);
      
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('atendimento_id', atendId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        return;
      }

      if (data) {
        console.log('✅ Mensagens carregadas:', data.length);
        
        // Adicionar status às mensagens
        const messagesWithStatus = data.map(msg => {
          let msgStatus = undefined;
          
          if (msg.remetente_tipo === 'vendedor' || msg.remetente_tipo === 'supervisor' || msg.remetente_tipo === 'ia') {
            if (msg.read_at) {
              msgStatus = 'lida' as const;
            } else if (msg.delivered_at) {
              msgStatus = 'entregue' as const;
            } else {
              msgStatus = 'enviada' as const;
            }
          }
          
          return { ...msg, status: msgStatus };
        });
        
        setMessages(messagesWithStatus);
        
        // Marcar como lidas as mensagens de clientes/IA não lidas
        if (vendedorId) {
          const unreadMessages = data.filter(
            msg => 
              (msg.remetente_tipo === 'cliente' || msg.remetente_tipo === 'ia') && 
              !msg.read_at
          );
          
          if (unreadMessages.length > 0) {
            const ids = unreadMessages.map(m => m.id);
            const now = new Date().toISOString();
            
            await supabase
              .from('mensagens')
              .update({ read_at: now, read_by_id: vendedorId })
              .in('id', ids);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [vendedorId]);

  // Setup realtime channel
  useEffect(() => {
    if (!atendimentoId || !enabled) {
      console.log('⏸️ Realtime desabilitado');
      return;
    }

    console.log('🔌 Configurando realtime para atendimento:', atendimentoId);

    // Buscar mensagens iniciais
    fetchMessages(atendimentoId);

    // Criar canal broadcast para este atendimento
    const channel = supabase.channel(`atendimento:${atendimentoId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    // Escutar notificações de mudanças em mensagens
    channel
      .on('broadcast', { event: 'message_change' }, (payload) => {
        console.log('📨 Notificação de mudança em mensagem:', payload);
        if (payload.payload?.atendimento_id === atendimentoId) {
          console.log('⟳ Recarregando mensagens...');
          fetchMessages(atendimentoId, true);
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('⌨️ Evento de digitação:', payload);
        if (payload.payload?.atendimentoId === atendimentoId && 
            payload.payload?.remetenteTipo === 'cliente') {
          setIsClientTyping(payload.payload.isTyping);
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          if (payload.payload.isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsClientTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Status do canal:', status);
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('🧹 Limpando realtime');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [atendimentoId, enabled, fetchMessages]);

  // Enviar notificação de mudança (para outras abas/usuários)
  const notifyMessageChange = useCallback(async (messageId: string) => {
    if (!atendimentoId || !channelRef.current) return;
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message_change',
      payload: {
        atendimento_id: atendimentoId,
        message_id: messageId,
        timestamp: new Date().toISOString()
      }
    });
  }, [atendimentoId]);

  // Adicionar mensagem otimista
  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Atualizar mensagem existente
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Remover mensagem otimista
  const removeOptimisticMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    loading,
    isClientTyping,
    fetchMessages,
    notifyMessageChange,
    addOptimisticMessage,
    updateMessage,
    removeOptimisticMessage
  };
}
