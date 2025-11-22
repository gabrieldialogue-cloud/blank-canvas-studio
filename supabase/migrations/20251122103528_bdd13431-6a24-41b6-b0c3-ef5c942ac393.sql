-- Drop existing policies
DROP POLICY IF EXISTS "Vendedores can view their atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Vendedores can update their atendimentos" ON atendimentos;

-- Policy for SELECT: Supervisors see all, vendedores see only their assigned atendimentos
CREATE POLICY "Users can view atendimentos based on role"
ON atendimentos
FOR SELECT
USING (
  -- Supervisors can see all atendimentos (including non-attributed)
  has_role(auth.uid(), 'supervisor'::app_role)
  OR
  -- Vendedores can only see atendimentos assigned to them
  (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_fixo_id IN (
      SELECT id FROM usuarios WHERE user_id = auth.uid()
    )
  )
);

-- Policy for UPDATE: Supervisors can update all, vendedores can update only their atendimentos
CREATE POLICY "Users can update atendimentos based on role"
ON atendimentos
FOR UPDATE
USING (
  -- Supervisors can update all atendimentos
  has_role(auth.uid(), 'supervisor'::app_role)
  OR
  -- Vendedores can only update their assigned atendimentos
  (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_fixo_id IN (
      SELECT id FROM usuarios WHERE user_id = auth.uid()
    )
  )
);