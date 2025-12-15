import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Atendimento = Tables<'atendimentos'> & {
  clientes?: Tables<'clientes'>;
  mensagens?: Tables<'mensagens'>[];
};

type NumberType = 'principal' | 'pessoal' | 'all';

interface UseAtendimentosOptions {
  numberType?: NumberType;
  vendedorId?: string | null;
}

export function useAtendimentos(options: UseAtendimentosOptions = {}) {
  const { numberType = 'all', vendedorId = null } = options;
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          console.log('Message updated (delivery/read status), refreshing...', payload);
          fetchAtendimentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [numberType, vendedorId]);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('atendimentos')
        .select(`
          *,
          clientes (*),
          mensagens (*)
        `);

      // Filter by number type if specified
      if (numberType !== 'all') {
        query = query.eq('number_type', numberType);
      }

      // Filter by vendedor if specified
      if (vendedorId) {
        query = query.eq('vendedor_fixo_id', vendedorId);
      }

      const { data, error } = await query;

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

  const getAtendimentosByNumberType = (type: 'principal' | 'pessoal') => {
    return atendimentos.filter(a => a.number_type === type);
  };

  return {
    atendimentos,
    loading,
    getAtendimentosByStatus,
    getAtendimentosByIntervencaoTipo,
    getAtendimentosByNumberType,
    refresh: fetchAtendimentos,
  };
}
