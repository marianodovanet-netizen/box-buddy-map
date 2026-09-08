CREATE POLICY "nap_fotos_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'nap-fotos');

CREATE POLICY "nap_fotos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'nap-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "nap_fotos_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'nap-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "nap_fotos_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'nap-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);