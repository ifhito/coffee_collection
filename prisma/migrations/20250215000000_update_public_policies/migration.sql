-- Update policies to grant anonymous read access and ensure privileges

-- Grant anonymous role access to schema and tables if they exist
DO $$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
DECLARE
  _tbl text;
BEGIN
  FOR _tbl IN SELECT unnest(ARRAY['bean_batches','bean_origins','flavor_notes','shops']) LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', _tbl);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Helper to recreate policy if table exists
DO $$
DECLARE
  _name text;
BEGIN
  -- Bean batches policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bean_batches') THEN
    EXECUTE 'DROP POLICY IF EXISTS beans_public_select ON public.bean_batches';
    EXECUTE 'CREATE POLICY beans_public_select ON public.bean_batches FOR SELECT TO anon USING (true)';
  END IF;

  -- Bean origins policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bean_origins') THEN
    EXECUTE 'DROP POLICY IF EXISTS bean_origins_public_select ON public.bean_origins';
    EXECUTE 'CREATE POLICY bean_origins_public_select ON public.bean_origins FOR SELECT TO anon USING (true)';
  END IF;

  -- Flavor notes policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flavor_notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS flavor_notes_public_select ON public.flavor_notes';
    EXECUTE 'CREATE POLICY flavor_notes_public_select ON public.flavor_notes FOR SELECT TO anon USING (true)';
  END IF;

  -- Shops policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops') THEN
    EXECUTE 'DROP POLICY IF EXISTS shops_public_select ON public.shops';
    EXECUTE 'CREATE POLICY shops_public_select ON public.shops FOR SELECT TO anon USING (true)';
  END IF;
END $$;
