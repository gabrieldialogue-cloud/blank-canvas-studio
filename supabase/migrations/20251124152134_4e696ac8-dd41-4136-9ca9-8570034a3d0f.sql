-- Adicionar política RLS de DELETE para a tabela clientes
-- Permite que usuários autenticados com roles de vendedor, supervisor ou super_admin excluam clientes

CREATE POLICY "Users can delete clientes"
ON public.clientes
FOR DELETE
USING (
  has_role(auth.uid(), 'vendedor'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);