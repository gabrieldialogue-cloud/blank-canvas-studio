-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-audios', 'chat-audios', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for audio bucket
CREATE POLICY "Authenticated users can upload audios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-audios');

CREATE POLICY "Everyone can view audios"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-audios');