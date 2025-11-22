-- Add delivered_at column to mensagens table for WhatsApp delivery status
ALTER TABLE public.mensagens
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;