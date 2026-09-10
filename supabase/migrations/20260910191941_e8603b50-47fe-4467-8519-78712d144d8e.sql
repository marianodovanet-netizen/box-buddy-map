ALTER TABLE public.naps ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'finalizada';

CREATE OR REPLACE FUNCTION public.naps_estado_valido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado NOT IN ('pendiente','en_curso','finalizada') THEN
    RAISE EXCEPTION 'Estado inválido: %', NEW.estado;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS naps_estado_valido_trg ON public.naps;
CREATE TRIGGER naps_estado_valido_trg
BEFORE INSERT OR UPDATE ON public.naps
FOR EACH ROW EXECUTE FUNCTION public.naps_estado_valido();

CREATE TABLE IF NOT EXISTS public.nap_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nap_id uuid NOT NULL REFERENCES public.naps(id) ON DELETE CASCADE,
  user_id uuid,
  actor_nombre text,
  accion text NOT NULL,
  cambios jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nap_historial TO authenticated;
GRANT ALL ON public.nap_historial TO service_role;

ALTER TABLE public.nap_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nap_historial_select_all" ON public.nap_historial
FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS nap_historial_nap_id_idx ON public.nap_historial (nap_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_nap_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cambios jsonb := '{}'::jsonb;
  actor text;
  campo text;
  campos text[] := ARRAY['codigo','tecnico','fecha','localidad','direccion','trabajo_realizado','observaciones','lat','lng','estado','fotos'];
  antes jsonb;
  despues jsonb;
BEGIN
  SELECT nombre INTO actor FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.nap_historial (nap_id, user_id, actor_nombre, accion, cambios)
    VALUES (NEW.id, auth.uid(), actor, 'creado', '{}'::jsonb);
    RETURN NEW;
  END IF;

  antes := to_jsonb(OLD);
  despues := to_jsonb(NEW);
  FOREACH campo IN ARRAY campos LOOP
    IF (antes -> campo) IS DISTINCT FROM (despues -> campo) THEN
      cambios := cambios || jsonb_build_object(campo, jsonb_build_object('antes', antes -> campo, 'despues', despues -> campo));
    END IF;
  END LOOP;

  IF cambios = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.nap_historial (nap_id, user_id, actor_nombre, accion, cambios)
  VALUES (NEW.id, auth.uid(), actor, CASE WHEN cambios ? 'estado' AND jsonb_object_keys_count(cambios) = 1 THEN 'estado' ELSE 'editado' END, cambios);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(j jsonb)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT count(*)::int FROM jsonb_object_keys(j) $$;

DROP TRIGGER IF EXISTS naps_historial_trg ON public.naps;
CREATE TRIGGER naps_historial_trg
AFTER INSERT OR UPDATE ON public.naps
FOR EACH ROW EXECUTE FUNCTION public.log_nap_change();