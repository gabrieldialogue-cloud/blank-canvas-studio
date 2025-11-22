-- Allow users to insert their own config_vendedores
CREATE POLICY "Users can insert own config"
ON public.config_vendedores
FOR INSERT
WITH CHECK (
  usuario_id IN (
    SELECT id FROM public.usuarios WHERE user_id = auth.uid()
  )
);