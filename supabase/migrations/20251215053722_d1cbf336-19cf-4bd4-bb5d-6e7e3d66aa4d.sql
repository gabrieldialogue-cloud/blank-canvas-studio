-- Create enum for number type
CREATE TYPE public.whatsapp_number_type AS ENUM ('principal', 'pessoal');

-- Create enum for API type
CREATE TYPE public.whatsapp_api_type AS ENUM ('meta', 'evolution');

-- Create unified table for all WhatsApp numbers
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_type whatsapp_number_type NOT NULL,
  api_type whatsapp_api_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Display info
  name TEXT NOT NULL,
  phone_display TEXT,
  
  -- Meta API specific fields (used when api_type = 'meta')
  phone_number_id TEXT,
  access_token TEXT,
  business_account_id TEXT,
  webhook_verify_token TEXT,
  verified_name TEXT,
  
  -- Evolution API specific fields (used when api_type = 'evolution')
  evolution_instance_name TEXT,
  evolution_phone_number TEXT,
  evolution_status TEXT DEFAULT 'disconnected',
  
  -- Personal number assignment (only for number_type = 'pessoal')
  vendedor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT personal_needs_vendedor CHECK (
    (number_type = 'principal') OR 
    (number_type = 'pessoal' AND vendedor_id IS NOT NULL)
  ),
  CONSTRAINT meta_needs_credentials CHECK (
    (api_type = 'evolution') OR 
    (api_type = 'meta' AND phone_number_id IS NOT NULL AND access_token IS NOT NULL)
  ),
  CONSTRAINT evolution_needs_instance CHECK (
    (api_type = 'meta') OR 
    (api_type = 'evolution' AND evolution_instance_name IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view whatsapp_numbers"
ON public.whatsapp_numbers
FOR SELECT
USING (true);

CREATE POLICY "Super admins can insert whatsapp_numbers"
ON public.whatsapp_numbers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update whatsapp_numbers"
ON public.whatsapp_numbers
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete whatsapp_numbers"
ON public.whatsapp_numbers
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at
BEFORE UPDATE ON public.whatsapp_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add number_type column to atendimentos to track which type of number originated the conversation
ALTER TABLE public.atendimentos 
ADD COLUMN number_type whatsapp_number_type DEFAULT 'principal';

-- Add whatsapp_number_id to track which specific number was used
ALTER TABLE public.atendimentos
ADD COLUMN whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL;