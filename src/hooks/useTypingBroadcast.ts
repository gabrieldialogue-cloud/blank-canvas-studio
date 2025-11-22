import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingBroadcast = (
  atendimentoId: string | null,
  isTyping: boolean,
  remetenteTipo: 'vendedor' | 'supervisor'
) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingStateRef = useRef(false);

  useEffect(() => {
    if (!atendimentoId) return;

    // Initialize channel
    channelRef.current = supabase.channel(`typing:${atendimentoId}`);
    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [atendimentoId]);

  useEffect(() => {
    if (!channelRef.current || !atendimentoId) return;

    // Only broadcast if state changed
    if (lastTypingStateRef.current === isTyping) return;
    lastTypingStateRef.current = isTyping;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Broadcast typing status
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        atendimentoId,
        remetenteTipo,
        isTyping
      }
    });

    // Auto-clear typing after 2 seconds of no activity
    if (isTyping) {
      timeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              atendimentoId,
              remetenteTipo,
              isTyping: false
            }
          });
          lastTypingStateRef.current = false;
        }
      }, 2000);
    }
  }, [isTyping, atendimentoId, remetenteTipo]);
};
