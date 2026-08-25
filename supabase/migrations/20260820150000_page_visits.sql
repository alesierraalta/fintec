CREATE TABLE IF NOT EXISTS public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamptz NOT NULL DEFAULT now(),
  visit_date date GENERATED ALWAYS AS ((visited_at AT TIME ZONE 'UTC')::date) STORED,
  path text NOT NULL CHECK (path ~ '^/' AND length(path) <= 512 AND path !~ '[?\r\n]'),
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  country_code char(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE INDEX IF NOT EXISTS page_visits_visited_at_path_idx ON public.page_visits (visited_at, path);
CREATE INDEX IF NOT EXISTS page_visits_visit_date_hash_idx ON public.page_visits (visit_date, ip_hash);
CREATE INDEX IF NOT EXISTS page_visits_visit_date_path_idx ON public.page_visits (visit_date, path);
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_visits FROM anon, authenticated;
GRANT ALL ON TABLE public.page_visits TO service_role;

CREATE OR REPLACE FUNCTION public.aggregate_page_visits(start_date date, end_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF start_date >= end_date OR end_date - start_date > 90 THEN RAISE EXCEPTION 'invalid page visit range'; END IF;
  SELECT jsonb_build_object(
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d::text, 'page_views', COALESCE(v.page_views,0), 'unique_visitors', COALESCE(v.unique_visitors,0)) ORDER BY d) FROM generate_series(start_date, end_date - 1, interval '1 day') d LEFT JOIN (SELECT visit_date, count(*) page_views, count(DISTINCT ip_hash) unique_visitors FROM page_visits WHERE visit_date >= start_date AND visit_date < end_date GROUP BY visit_date) v ON v.visit_date = d::date), '[]'::jsonb),
    'routes', COALESCE((SELECT jsonb_agg(jsonb_build_object('path', path, 'page_views', page_views) ORDER BY page_views DESC, path) FROM (SELECT path, count(*) page_views FROM page_visits WHERE visit_date >= start_date AND visit_date < end_date GROUP BY path ORDER BY page_views DESC, path LIMIT 20) r), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.aggregate_page_visits(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_page_visits(date, date) TO service_role;
