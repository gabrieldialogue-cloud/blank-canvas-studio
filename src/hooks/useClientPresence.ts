import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientPresence {
  atendimentoId: string;
  isOnline: boolean;
  isTyping: boolean;
  lastSeenAt: string | null;
}

interface UseClientPresenceProps {
  atendimentos: any[];
  enabled: boolean;
}

export function useClientPresence({ atendimentos, enabled }: UseClientPresenceProps) {
  const [clientPresence, setClientPresence] = useState<Record<string, ClientPresence>>({});
  const onlineTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!enabled || atendimentos.length === 0) return;

    const updatePresenceFromActivity = async () => {
      const presenceMap: Record<string, ClientPresence> = {};
      
      for (const atendimento of atendimentos) {
        // Get last client message to determine if recently active
        const { data: lastClientMsg } = await supabase
          .from('mensagens')
          .select('created_at, remetente_tipo')
          .eq('atendimento_id', atendimento.id)
          .eq('remetente_tipo', 'cliente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isRecentlyActive = lastClientMsg && 
          (new Date().getTime() - new Date(lastClientMsg.created_at).getTime()) < 20 * 1000; // 20 seconds

        presenceMap[atendimento.id] = {
          atendimentoId: atendimento.id,
          isOnline: !!isRecentlyActive,
          isTyping: false,
          lastSeenAt: lastClientMsg?.created_at || null
        };

        // Se estiver marcado como online por atividade recente, agenda o timeout para desligar
        if (isRecentlyActive) {
          if (onlineTimeouts.current[atendimento.id]) {
            clearTimeout(onlineTimeouts.current[atendimento.id]);
          }

          onlineTimeouts.current[atendimento.id] = setTimeout(() => {
            setClientPresence(prev => ({
              ...prev,
              [atendimento.id]: {
                ...prev[atendimento.id],
                isOnline: false,
              },
            }));
          }, 20 * 1000);
        }
      }
      
      setClientPresence(presenceMap);
    };

    updatePresenceFromActivity();

    // Subscribe to global presence broadcast channel
    const globalChannel = supabase.channel('global-client-presence');
    
    globalChannel
      .on('broadcast', { event: 'client_online' }, (payload) => {
        const atendimentoId = payload.payload.atendimentoId;
        const isOnline = payload.payload.isOnline;
        
        console.log(`📡 Global broadcast client_online recebido para ${atendimentoId}:`, isOnline);
        
        // Verificar se este atendimento está na lista
        const atendimento = atendimentos.find(a => a.id === atendimentoId);
        if (!atendimento) return;
        
        setClientPresence(prev => ({
          ...prev,
          [atendimentoId]: {
            ...prev[atendimentoId],
            isOnline: isOnline,
            lastSeenAt: isOnline ? new Date().toISOString() : prev[atendimentoId]?.lastSeenAt
          }
        }));

        // Clear existing timeout
        if (onlineTimeouts.current[atendimentoId]) {
          clearTimeout(onlineTimeouts.current[atendimentoId]);
        }

        // If going online, set timeout to clear after 20 seconds
        if (isOnline) {
          onlineTimeouts.current[atendimentoId] = setTimeout(() => {
            setClientPresence(prev => ({
              ...prev,
              [atendimentoId]: {
                ...prev[atendimentoId],
                isOnline: false
              }
            }));
          }, 20 * 1000);
        }
      })
      .subscribe();

    // Subscribe to new messages to update presence
    const channels = atendimentos.map(atendimento => {
      const channel = supabase.channel(`client-presence:${atendimento.id}`);
      
      channel
        .on('broadcast', { event: 'client_typing' }, (payload) => {
          const atendId = atendimento.id;
          const isTyping = payload.payload.isTyping;
          
          console.log(`⌨️ Recebido broadcast client_typing para ${atendId}:`, isTyping);
          
          setClientPresence(prev => ({
            ...prev,
            [atendId]: {
              ...prev[atendId],
              isTyping: isTyping
            }
          }));
          
          // Clear existing timeout
          if (typingTimeouts.current[atendId]) {
            clearTimeout(typingTimeouts.current[atendId]);
          }

          if (isTyping) {
            typingTimeouts.current[atendId] = setTimeout(() => {
              setClientPresence(prev => ({
                ...prev,
                [atendId]: {
                  ...prev[atendId],
                  isTyping: false
                }
              }));
            }, 3000);
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `atendimento_id=eq.${atendimento.id}`
        }, (payload: any) => {
          if (payload.new.remetente_tipo === 'cliente') {
            const atendId = atendimento.id;
            
            console.log(`📨 Nova mensagem de cliente para ${atendId}, marcando como online`);
            
            // Cliente enviou mensagem, está online
            setClientPresence(prev => ({
              ...prev,
              [atendId]: {
                ...prev[atendId],
                isOnline: true,
                isTyping: false,
                lastSeenAt: new Date().toISOString()
              }
            }));
            
            // Clear typing timeout
            if (typingTimeouts.current[atendId]) {
              clearTimeout(typingTimeouts.current[atendId]);
            }

            // Clear existing online timeout
            if (onlineTimeouts.current[atendId]) {
              clearTimeout(onlineTimeouts.current[atendId]);
            }

            // Clear online status after 20 seconds of inactivity
            onlineTimeouts.current[atendId] = setTimeout(() => {
              setClientPresence(prev => ({
                ...prev,
                [atendId]: {
                  ...prev[atendId],
                  isOnline: false
                }
              }));
            }, 20 * 1000);
          }
        })
        .subscribe();
      
      return channel;
    });

    return () => {
      // Clear all timeouts
      Object.values(onlineTimeouts.current).forEach(timeout => clearTimeout(timeout));
      Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout));
      onlineTimeouts.current = {};
      typingTimeouts.current = {};
      
      // Remove global channel
      supabase.removeChannel(globalChannel);
      
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [atendimentos, enabled]);

  return { clientPresence };
}
