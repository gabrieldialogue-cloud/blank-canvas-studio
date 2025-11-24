import { useEffect, useState } from 'react';
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
  const fetchUnreadCounts = async () => {
    if (!vendedorId || !enabled || atendimentos.length === 0) return;

    const counts: Record<string, number> = {};
    
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
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [atendimentos, vendedorId, enabled]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enabled || !vendedorId) return;

    const channel = supabase
      .channel('unread-counts-vendedor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens'
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorId, atendimentos]);

  // Clear unread count for specific atendimento
  const clearUnreadCount = (atendimentoId: string) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[atendimentoId];
      return newCounts;
    });
  };

  return { unreadCounts, clearUnreadCount, refreshUnreadCounts: fetchUnreadCounts };
}
