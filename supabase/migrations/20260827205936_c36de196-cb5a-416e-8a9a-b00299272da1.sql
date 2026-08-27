CREATE POLICY "Waiver receipts can be uploaded"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'waivers');

CREATE POLICY "Waiver receipts can be replaced"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'waivers')
WITH CHECK (bucket_id = 'waivers');

CREATE POLICY "Waiver receipts can be read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'waivers');