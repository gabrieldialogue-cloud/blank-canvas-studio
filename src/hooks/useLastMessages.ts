import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LastMessage {
  atendimentoId: string;
  conteudo: string;
  attachmentType: string | null;
  attachmentUrl: string | null;
  attachmentFilename: string | null;
  createdAt: string;
  remetenteTipo: string;
  attachmentCount?: number;
  readAt?: string | null;
  deliveredAt?: string | null;
}

interface UseLastMessagesProps {
  atendimentos: any[];
  enabled: boolean;
}

export function useLastMessages({ atendimentos, enabled }: UseLastMessagesProps) {
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});

  const fetchLastMessages = async () => {
    if (!enabled || atendimentos.length === 0) return;

    const messagesMap: Record<string, LastMessage> = {};
    
    for (const atendimento of atendimentos) {
      // Get last message
      const { data: lastMsgs, error: lastMsgError } = await supabase
        .from('mensagens')
        .select('conteudo, attachment_type, attachment_url, attachment_filename, created_at, remetente_tipo, read_at, delivered_at')
        .eq('atendimento_id', atendimento.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastMsgError) {
        console.error('Erro ao buscar última mensagem:', lastMsgError.message);
      }

      const lastMsg = lastMsgs?.[0];
      
      // Get attachment count
      const { count: attachmentCount } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('atendimento_id', atendimento.id)
        .not('attachment_url', 'is', null);
      
      if (lastMsg) {
        messagesMap[atendimento.id] = {
          atendimentoId: atendimento.id,
          conteudo: lastMsg.conteudo,
          attachmentType: lastMsg.attachment_type,
          attachmentUrl: lastMsg.attachment_url,
          attachmentFilename: lastMsg.attachment_filename,
          createdAt: lastMsg.created_at,
          remetenteTipo: lastMsg.remetente_tipo,
          attachmentCount: attachmentCount || 0,
          readAt: lastMsg.read_at,
          deliveredAt: lastMsg.delivered_at
        };
      }
    }
    
    setLastMessages(messagesMap);
  };

  // Initial fetch
  useEffect(() => {
    fetchLastMessages();
  }, [atendimentos, enabled]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('last-messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens'
        },
        () => {
          fetchLastMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, atendimentos]);

  return { lastMessages, refreshLastMessages: fetchLastMessages };
}
