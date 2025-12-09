-- Add source column to atendimentos to identify origin (meta or evolution)
ALTER TABLE public.atendimentos 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'meta';

-- Add evolution_instance_name to track which instance received the message
ALTER TABLE public.atendimentos 
ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT;

-- Add source column to mensagens to identify origin
ALTER TABLE public.mensagens 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'meta';

-- Create index for faster queries by source
CREATE INDEX IF NOT EXISTS idx_atendimentos_source ON public.atendimentos(source);
CREATE INDEX IF NOT EXISTS idx_atendimentos_evolution_instance ON public.atendimentos(evolution_instance_name);

-- Comment for documentation
COMMENT ON COLUMN public.atendimentos.source IS 'Origin of the atendimento: meta (official WhatsApp API) or evolution (personal number)';
COMMENT ON COLUMN public.atendimentos.evolution_instance_name IS 'Name of the Evolution API instance that received the message';
COMMENT ON COLUMN public.mensagens.source IS 'Origin of the message: meta or evolution';