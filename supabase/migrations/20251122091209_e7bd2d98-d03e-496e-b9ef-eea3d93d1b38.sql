-- Criar tabela de gerenciamento de vendedores pelo supervisor
CREATE TABLE IF NOT EXISTS public.vendedor_supervisor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  supervisor_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendedor_id)
);

ALTER TABLE public.vendedor_supervisor ENABLE ROW LEVEL SECURITY;

-- RLS policies para vendedor_supervisor
CREATE POLICY "Supervisors can manage vendedor assignments"
ON public.vendedor_supervisor
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'supervisor'::app_role
  )
);

CREATE POLICY "Vendedores can view their supervisor"
ON public.vendedor_supervisor
FOR SELECT
USING (
  vendedor_id IN (
    SELECT id FROM public.usuarios WHERE user_id = auth.uid()
  )
);