-- Create storage buckets for AngleCraft.
-- Both buckets are private — images are served via signed URLs generated
-- server-side with the service-role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ad-creatives', 'ad-creatives', false, '52428800', '{"image/png","image/jpeg"}'),
  ('product-photos', 'product-photos', false, '52428800', '{"image/png","image/jpeg","image/webp"}')
on conflict (id) do nothing;
