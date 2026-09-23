-- Admin roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Review workflow on events
ALTER TABLE public.events
  ADD COLUMN review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid;

ALTER TABLE public.events
  ADD CONSTRAINT events_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

UPDATE public.events SET review_status = 'approved', reviewed_at = now();

CREATE INDEX events_review_status_idx ON public.events (review_status, starts_at);

-- Read rules
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;

CREATE POLICY "Approved events are publicly readable"
ON public.events FOR SELECT
USING (review_status = 'approved');

CREATE POLICY "Admins can read all events"
ON public.events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.events TO anon;
GRANT SELECT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;