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
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching atendimentos:', error);
        toast({
          title: 'Erro ao carregar atendimentos',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setAtendimentos(data || []);
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
