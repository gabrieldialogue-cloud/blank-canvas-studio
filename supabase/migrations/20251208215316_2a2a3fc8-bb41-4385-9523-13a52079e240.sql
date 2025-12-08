-- Create table to store Meta WhatsApp numbers (official API)
CREATE TABLE public.meta_whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  business_account_id TEXT,
  webhook_verify_token TEXT,
  phone_display TEXT,
  verified_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage (only super admin should access this)
CREATE POLICY "Authenticated users can view meta_whatsapp_numbers" 
ON public.meta_whatsapp_numbers 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert meta_whatsapp_numbers" 
ON public.meta_whatsapp_numbers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update meta_whatsapp_numbers" 
ON public.meta_whatsapp_numbers 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete meta_whatsapp_numbers" 
ON public.meta_whatsapp_numbers 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_meta_whatsapp_numbers_updated_at
BEFORE UPDATE ON public.meta_whatsapp_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();