-- Fix atendimentos that were incorrectly converted from Meta to Evolution
-- These atendimentos originally came from the main number (Meta) but had their source changed
-- We need to revert them back to Meta so they show in the main tab

-- First, identify atendimentos that have BOTH meta and evolution messages
-- These were likely originally Meta atendimentos that got incorrectly updated

-- Revert the Marcos Alves atendimento specifically (has meta messages from November)
UPDATE public.atendimentos
SET 
  source = 'meta',
  evolution_instance_name = NULL,
  updated_at = now()
WHERE id = '8ccb89cd-fc76-42f1-b34d-9bb553aad7f3'
  AND source = 'evolution';

-- Also revert Gabriel's atendimento if it has mixed messages
-- (This one should already be 'meta' but just to be safe)
UPDATE public.atendimentos
SET 
  source = 'meta',
  evolution_instance_name = NULL,
  updated_at = now()
WHERE id = 'bf4e626e-7220-4a7a-a707-e19df0277d94'
  AND source IS DISTINCT FROM 'meta';