import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Atendimento = Tables<'atendimentos'> & {
  clientes?: Tables<'clientes'>;
  mensagens?: Tables<'mensagens'>[];
};

export function useAtendimentos() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAtendimentos();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('atendimentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atendimentos'
        },
        () => {
          console.log('Atendimento updated, refreshing...');
          fetchAtendimentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        () => {
          console.log('New message received, refreshing...');
          fetchAtendimentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          *,
          clientes (*),
          mensagens (*)
        `);

      if (error) {
        console.error('Error fetching atendimentos:', error);
        toast({
          title: 'Erro ao carregar atendimentos',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Sort by most recent message
      const sorted = (data || []).sort((a, b) => {
        const lastMessageA = a.mensagens && a.mensagens.length > 0 
          ? Math.max(...a.mensagens.map((m: any) => new Date(m.created_at).getTime()))
          : new Date(a.created_at).getTime();
        
        const lastMessageB = b.mensagens && b.mensagens.length > 0
          ? Math.max(...b.mensagens.map((m: any) => new Date(m.created_at).getTime()))
          : new Date(b.created_at).getTime();
        
        return lastMessageB - lastMessageA;
      });

      setAtendimentos(sorted);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAtendimentosByStatus = (status: string) => {
    return atendimentos.filter(a => a.status === status);
  };

  const getAtendimentosByIntervencaoTipo = (tipo: string) => {
    // This would need to join with intervencoes table
    return [];
  };

  return {
    atendimentos,
    loading,
    getAtendimentosByStatus,
    getAtendimentosByIntervencaoTipo,
    refresh: fetchAtendimentos,
  };
}
