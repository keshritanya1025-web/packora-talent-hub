
-- Roles enum + user_roles table (security best practice)
CREATE TYPE public.app_role AS ENUM ('system_admin', 'recruiter', 'business_lead');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Auto profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  -- Default new user role: recruiter (admin can change later)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recruiter');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Reference tables
CREATE TABLE public.business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_units TO authenticated;
GRANT ALL ON public.business_units TO service_role;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BU readable" ON public.business_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "BU admin write" ON public.business_units FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiters TO authenticated;
GRANT ALL ON public.recruiters TO service_role;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters readable" ON public.recruiters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters admin write" ON public.recruiters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations readable" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Locations admin write" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sources readable" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sources admin write" ON public.sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels readable" ON public.levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Levels admin write" ON public.levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Departments readable" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Departments admin write" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin')) WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
