-- Drop existing policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view evolution config" ON public.evolution_config;
DROP POLICY IF EXISTS "Authenticated users can insert evolution config" ON public.evolution_config;
DROP POLICY IF EXISTS "Authenticated users can update evolution config" ON public.evolution_config;
DROP POLICY IF EXISTS "Authenticated users can delete evolution config" ON public.evolution_config;

-- Recreate with explicit PERMISSIVE
CREATE POLICY "Authenticated users can view evolution config" 
ON public.evolution_config 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert evolution config" 
ON public.evolution_config 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update evolution config" 
ON public.evolution_config 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete evolution config" 
ON public.evolution_config 
FOR DELETE 
TO authenticated
USING (true);