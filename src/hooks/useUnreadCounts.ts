import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUnreadCountsProps {
  atendimentos: any[];
  vendedorId: string | null;
  enabled: boolean;
  currentAtendimentoId?: string | null;
}

export function useUnreadCounts({ atendimentos, vendedorId, enabled, currentAtendimentoId }: UseUnreadCountsProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Fetch unread counts for all atendimentos
  const fetchUnreadCounts = useCallback(async () => {
    if (!vendedorId || !enabled || atendimentos.length === 0) {
      setUnreadCounts({});
      return;
    }

    const counts: Record<string, number> = {};
    
    // Contar não lidas para TODOS os atendimentos, sem exceção
    for (const atendimento of atendimentos) {
      const { count } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('atendimento_id', atendimento.id)
        .in('remetente_tipo', ['cliente', 'ia'])
        .is('read_at', null);
      
      if (count && count > 0) {
        counts[atendimento.id] = count;
      }
    }
    
    setUnreadCounts(counts);
  }, [vendedorId, enabled, atendimentos]);

  // Fetch inicial e quando a lista de atendimentos ou atendimento atual mudar
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Subscribe to real-time updates - INSERTs e UPDATEs de mensagens
  useEffect(() => {
    if (!enabled || !vendedorId) return;

    const channel = supabase
      .channel('unread-counts-vendedor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          // Nova mensagem de cliente/IA - sempre incrementar, independente do atendimento atual
          if (payload.new && 
              (payload.new.remetente_tipo === 'cliente' || payload.new.remetente_tipo === 'ia')) {
            const atendimentoId = payload.new.atendimento_id;
            
            setUnreadCounts(prev => ({
              ...prev,
              [atendimentoId]: (prev[atendimentoId] || 0) + 1
            }));
          }
        }
      )
      // REMOVIDO: Listener de UPDATE
      // Não precisamos decrementar o contador via UPDATE porque já limpamos localmente 
      // quando o usuário clica no card (clearUnreadCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorId]);

  // Marcar mensagens como lidas e limpar contador
  const clearUnreadCount = useCallback(async (atendimentoId: string) => {
    if (!vendedorId) return;
    
    console.log('🧹 Limpando contador e marcando mensagens como lidas para:', atendimentoId);
    
    // Primeiro, remover do contador local IMEDIATAMENTE
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[atendimentoId];
      return newCounts;
    });
    
    // Depois marcar mensagens como lidas no banco
    // (isso vai disparar UPDATEs, mas já limpamos o contador local então não terá efeito)
    const { data: unreadMessages } = await supabase
      .from('mensagens')
      .select('id')
      .eq('atendimento_id', atendimentoId)
      .in('remetente_tipo', ['cliente', 'ia'])
      .is('read_at', null);
    
    if (unreadMessages && unreadMessages.length > 0) {
      const ids = unreadMessages.map(m => m.id);
      const now = new Date().toISOString();
      
      // Marcar como lidas
      await supabase
        .from('mensagens')
        .update({ read_at: now, read_by_id: vendedorId })
        .in('id', ids);
    }
  }, [vendedorId]);

  return { unreadCounts, clearUnreadCount, refreshUnreadCounts: fetchUnreadCounts };
}
