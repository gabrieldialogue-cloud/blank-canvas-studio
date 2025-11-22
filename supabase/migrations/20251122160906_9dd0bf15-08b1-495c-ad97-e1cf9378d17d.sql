-- Enable realtime for mensagens table
ALTER TABLE public.mensagens REPLICA IDENTITY FULL;

-- Add mensagens table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;

-- Enable realtime for atendimentos table (para status updates)
ALTER TABLE public.atendimentos REPLICA IDENTITY FULL;

-- Add atendimentos table to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimentos;