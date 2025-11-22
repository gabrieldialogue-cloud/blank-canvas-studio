-- Allow supervisors to update config of their assigned vendedores
CREATE POLICY "Supervisors can update assigned vendedores config"
ON config_vendedores
FOR UPDATE
USING (
  usuario_id IN (
    SELECT vs.vendedor_id 
    FROM vendedor_supervisor vs
    JOIN usuarios u ON u.id = vs.supervisor_id
    WHERE u.user_id = auth.uid()
  )
);