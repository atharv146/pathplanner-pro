
-- Enums
CREATE TYPE public.account_type AS ENUM ('student', 'parent');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL DEFAULT 'student',
  full_name TEXT,
  grade_level INT,
  target_major TEXT,
  target_college TEXT,
  undecided BOOLEAN NOT NULL DEFAULT false,
  gpa NUMERIC(3,2),
  extracurriculars TEXT,
  test_scores TEXT,
  first_gen BOOLEAN,
  immigration_status TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, account_type, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'student'),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roadmap items (global template, read by all authenticated users)
CREATE TABLE public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INT NOT NULL CHECK (grade BETWEEN 6 AND 12),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read roadmap items" ON public.roadmap_items FOR SELECT TO authenticated USING (true);

-- User progress
CREATE TABLE public.user_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.user_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat" ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_messages_user_created_idx ON public.chat_messages(user_id, created_at);

-- Parent articles
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  read_minutes INT NOT NULL DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published articles" ON public.articles FOR SELECT TO authenticated USING (published = true);

-- Seed roadmap items
INSERT INTO public.roadmap_items (grade, category, title, description, order_index) VALUES
-- Grade 6
(6, 'Academics', 'Build strong study habits', 'Establish a consistent homework routine, use a planner, and start tracking assignments. Strong foundations now compound for years.', 1),
(6, 'Exploration', 'Try three new activities', 'Sample a sport, a creative pursuit, and a service activity. The goal is exposure, not commitment.', 2),
(6, 'Reading', 'Read 10 books this year', 'Independent reading grows vocabulary and analytical skills — key for future standardized tests and essays.', 3),
-- Grade 7
(7, 'Academics', 'Aim for challenging math placement', 'Talk to your counselor about honors or accelerated math tracks; 7th grade placement often determines your high school ceiling.', 1),
(7, 'Exploration', 'Pick two activities to go deeper on', 'Start narrowing what you love. Depth beats breadth by the time colleges look.', 2),
(7, 'Skills', 'Learn to type fluently', 'Aim for 40+ WPM. It pays off every year of school and work after.', 3),
-- Grade 8
(8, 'Academics', 'Plan your 9th grade course load', 'Meet with your counselor to map honors options and prerequisites for AP/IB tracks.', 1),
(8, 'Testing', 'Try a practice PSAT 8/9', 'A low-stakes baseline. Use results to target weak areas early.', 2),
(8, 'Leadership', 'Take on a small leadership role', 'Team captain, club officer, tutor — something that shows initiative.', 3),
-- Grade 9
(9, 'Academics', 'Protect your GPA from day one', 'Freshman grades count. Build systems for every class in the first month.', 1),
(9, 'Extracurriculars', 'Commit to 2–3 activities', 'Pick things you can grow in for four years. Consistency signals commitment.', 2),
(9, 'Summer', 'Plan a meaningful summer', 'Job, camp, project, or self-directed learning — anything intentional beats idle time.', 3),
-- Grade 10
(10, 'Testing', 'Take the PSAT', 'Real test-day practice and a baseline for SAT prep. National Merit qualifies in 11th, but 10th is your rehearsal.', 1),
(10, 'Academics', 'Add rigor with an AP or honors class', 'Colleges look for upward trajectory. One AP as a sophomore is a strong signal.', 2),
(10, 'Extracurriculars', 'Grow into a leadership role', 'Officer, captain, or founder. Start building your impact story.', 3),
(10, 'College', 'Visit a few nearby campuses', 'Even casual visits help you understand what "fit" means to you.', 4),
-- Grade 11
(11, 'Testing', 'Prep for and take the SAT or ACT', 'Junior year is prime testing time. Plan 2–3 months of prep before your first attempt.', 1),
(11, 'Academics', 'Take the hardest classes you can handle', 'Junior year rigor is what admissions officers scrutinize most.', 2),
(11, 'College', 'Build a preliminary college list', 'Aim for 10–15 schools across reach, target, and likely categories.', 3),
(11, 'Relationships', 'Cultivate two teacher recommenders', 'Junior year teachers know you best. Engage in class and stay in touch.', 4),
(11, 'Summer', 'Do something substantive', 'Research, internship, program, or a serious independent project. This is your last big summer.', 5),
-- Grade 12
(12, 'Applications', 'Finalize your college list', 'Balance reach, target, and safety schools. Confirm application requirements and deadlines.', 1),
(12, 'Essays', 'Draft the Common App personal statement', 'Start in summer, revise through fall. Show voice, not achievements.', 2),
(12, 'Applications', 'Submit early action / early decision', 'ED/EA deadlines are usually Nov 1. Prepare materials by mid-October.', 3),
(12, 'Financial Aid', 'File FAFSA and CSS Profile', 'FAFSA opens Oct 1 (or Dec 1 for the 2024-25 cycle). Do not delay — some aid is first-come.', 4),
(12, 'Applications', 'Submit regular decision apps', 'Most RD deadlines are Jan 1–15. Give yourself a full week of buffer.', 5),
(12, 'Decision', 'Compare offers and commit by May 1', 'Weigh fit, cost, and opportunity. Trust your research.', 6);
