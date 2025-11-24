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
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para marcar mensagens como lidas
  const markMessagesAsRead = useCallback(async (atendId: string) => {
    if (!vendedorId) return;
    
    const { data: unreadMessages } = await supabase
      .from('mensagens')
      .select('id')
      .eq('atendimento_id', atendId)
      .in('remetente_tipo', ['cliente', 'ia'])
      .is('read_at', null);
    
    if (unreadMessages && unreadMessages.length > 0) {
      const ids = unreadMessages.map(m => m.id);
      const now = new Date().toISOString();
      
      await supabase
        .from('mensagens')
        .update({ read_at: now, read_by_id: vendedorId })
        .in('id', ids);
    }
  }, [vendedorId]);

  // Função para buscar mensagens do banco (últimas 10)
  const fetchMessages = useCallback(async (atendId: string, silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      console.log('📥 Buscando mensagens do atendimento:', atendId);
      
      const { data, error, count } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact' })
        .eq('atendimento_id', atendId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        return;
      }

      if (data) {
        const sortedData = data.reverse(); // Inverter para ordem cronológica
        console.log(`✅ ${sortedData.length} mensagens carregadas (de ${count || 0} total)`);
        
        // Adicionar status às mensagens
        const messagesWithStatus = sortedData.map(msg => {
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
        setHasMoreMessages((count || 0) > 10);
        setOldestMessageDate(sortedData.length > 0 ? sortedData[0].created_at : null);
        
        // NÃO marcar como lidas automaticamente - será feito manualmente via clearUnreadCount
      }
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [vendedorId]);

  // Carregar mensagens antigas
  const loadMoreMessages = useCallback(async () => {
    if (!atendimentoId || !oldestMessageDate || !hasMoreMessages || loading) return;

    setIsLoadingOlder(true);
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact' })
        .eq('atendimento_id', atendimentoId)
        .lt('created_at', oldestMessageDate)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const sortedData = data.reverse();
        
        const messagesWithStatus = sortedData.map(msg => {
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
        
        setMessages(prev => [...messagesWithStatus, ...prev]);
        setOldestMessageDate(sortedData[0].created_at);
        
        const totalLoaded = messages.length + sortedData.length;
        setHasMoreMessages((count || 0) > totalLoaded);
        
        console.log(`✅ ${sortedData.length} mensagens antigas carregadas`);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens antigas:', error);
    } finally {
      setLoading(false);
      // Pequeno delay para garantir que o DOM foi atualizado antes de resetar o flag
      setTimeout(() => {
        setIsLoadingOlder(false);
      }, 100);
    }
  }, [atendimentoId, oldestMessageDate, hasMoreMessages, loading, messages.length]);

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

    // Escutar notificações de mudanças em mensagens e eventos de digitação
    channel
      .on('broadcast', { event: 'message_change' }, (payload) => {
        console.log('📨 Notificação de mudança em mensagem (broadcast):', payload);
        if (payload.payload?.atendimento_id === atendimentoId) {
          console.log('⟳ Recarregando mensagens (broadcast)...');
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensagens',
        filter: `atendimento_id=eq.${atendimentoId}`
      }, async (payload) => {
        console.log('🆕 Mudança em mensagens via postgres_changes:', payload);
        console.log('⟳ Recarregando mensagens (postgres_changes)...');
        
        // NÃO marcar mensagens como lidas automaticamente aqui
        // Deixar apenas para quando o usuário clicar no card via clearUnreadCount
        
        fetchMessages(atendimentoId, true);
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
    isLoadingOlder,
    fetchMessages,
    notifyMessageChange,
    addOptimisticMessage,
    updateMessage,
    removeOptimisticMessage,
    loadMoreMessages,
    hasMoreMessages,
    markMessagesAsRead
  };
}