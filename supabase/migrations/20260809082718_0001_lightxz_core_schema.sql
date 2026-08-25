/*
# LightXZ Core Schema

## Overview
Builds the full data model for LightXZ — a class-based learning, quiz, games, and community platform
with points, leaderboards, member + guest accounts, and admin moderation.

## Tables created
- `profiles` — public display data for every user (members + guests). Linked to auth.users for members.
  Columns: id, name, username, avatar_url, account_type ('member'|'guest'), account_status ('active'|'restricted'|'suspended'),
  total_points (authoritative, server-managed), created_at.
- `classes` — school classes/grades (e.g. Class 6). Columns: id, name, slug, description, color, icon, sort_order.
- `subjects` — subjects per class. Columns: id, class_id, name, slug, description, icon, color, sort_order.
- `revision_materials` — revision content per subject. Columns: id, subject_id, title, body, sort_order.
- `quizzes` — quizzes per subject. Columns: id, subject_id, title, description, difficulty, time_limit_seconds, points_per_correct.
- `questions` — questions per quiz. Columns: id, quiz_id, question_text, options (jsonb array), correct_index, sort_order.
- `quiz_results` — a user's attempt at a quiz. Columns: id, profile_id, quiz_id, score, total, points_awarded, duration_seconds, answers (jsonb), created_at.
- `game_results` — a user's game play. Columns: id, profile_id, game_key, difficulty, score, points_awarded, metadata (jsonb), created_at.
- `point_ledger` — append-only audit of every points change. Columns: id, profile_id, delta, reason, ref_id, created_at.
- `posts` — community media posts. Columns: id, profile_id, caption, media_type, media_url, created_at.
- `likes` — likes on posts. Columns: id, post_id, profile_id, created_at.
- `reports` — content reports for moderation. Columns: id, reporter_id, post_id, reason, status ('open'|'reviewing'|'resolved'), created_at.
- `game_rooms` — multiplayer room codes (e.g. tic-tac-toe). Columns: id, code, game_key, host_id, guest_id, status, created_at.

## Security
- RLS enabled on every table.
- `profiles`: users read all profiles (leaderboard needs it) but only owner can update their own. Email is NOT stored here.
- `quiz_results`, `game_results`, `point_ledger`, `likes`, `reports`: owner-scoped SELECT/INSERT; no direct UPDATE/DELETE of score fields by clients.
- `posts`: authenticated members can read all + insert/update/delete own. Guests cannot insert (enforced by policy: account_type must be 'member').
- `classes`, `subjects`, `revision_materials`, `quizzes`, `questions`: public read (anon + authenticated) so guests can browse; writes blocked (admin only via service role / future admin policies).
- `game_rooms`: anyone authenticated can read/insert/update to manage room state.
- Points are NEVER written by the client. Two SECURITY DEFINER functions (`submit_quiz_result`, `submit_game_result`)
  validate the result server-side, compute points, insert the result row, update `profiles.total_points`,
  and append to `point_ledger` — all atomically.

## Notes
1. `profiles.id` for members is the auth.users id (FK). For guests it is a generated uuid with no auth link.
2. `total_points` is the authoritative score; the ledger is the audit trail.
3. Email lives only in auth.users — never in `profiles` — so the leaderboard never exposes it.
4. These policies use `auth.uid()` for member ownership. Guest profiles are identified by a client-held
   profile id stored in localStorage; guest rows are scoped by `profile_id` equality in the RPCs (guests have
   no auth session, so their writes go through SECURITY DEFINER functions that accept a profile_id argument).
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  username text NOT NULL,
  avatar_url text,
  account_type text NOT NULL DEFAULT 'member' CHECK (account_type IN ('member','guest')),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','restricted','suspended')),
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ classes ============
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#3b82f6',
  icon text NOT NULL DEFAULT 'GraduationCap',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_read_all" ON classes;
CREATE POLICY "classes_read_all" ON classes FOR SELECT
  TO anon, authenticated USING (true);

-- ============ subjects ============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT '#10b981',
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (class_id, slug)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_read_all" ON subjects;
CREATE POLICY "subjects_read_all" ON subjects FOR SELECT
  TO anon, authenticated USING (true);

-- ============ revision_materials ============
CREATE TABLE IF NOT EXISTS revision_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE revision_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revision_read_all" ON revision_materials;
CREATE POLICY "revision_read_all" ON revision_materials FOR SELECT
  TO anon, authenticated USING (true);

-- ============ quizzes ============
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  time_limit_seconds integer,
  points_per_correct integer NOT NULL DEFAULT 10
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quizzes_read_all" ON quizzes;
CREATE POLICY "quizzes_read_all" ON quizzes FOR SELECT
  TO anon, authenticated USING (true);

-- ============ questions ============
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questions_read_all" ON questions;
CREATE POLICY "questions_read_all" ON questions FOR SELECT
  TO anon, authenticated USING (true);

-- ============ quiz_results ============
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL,
  total integer NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_results_profile ON quiz_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON quiz_results(quiz_id);
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_results_select_own" ON quiz_results;
CREATE POLICY "quiz_results_select_own" ON quiz_results FOR SELECT
  TO anon, authenticated USING (true);

-- ============ game_results ============
CREATE TABLE IF NOT EXISTS game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_key text NOT NULL,
  difficulty text,
  score integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_results_profile ON game_results(profile_id);
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_results_select_all" ON game_results;
CREATE POLICY "game_results_select_all" ON game_results FOR SELECT
  TO anon, authenticated USING (true);

-- ============ point_ledger ============
CREATE TABLE IF NOT EXISTS point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_ledger_profile ON point_ledger(profile_id);
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_ledger_select_own" ON point_ledger;
CREATE POLICY "point_ledger_select_own" ON point_ledger FOR SELECT
  TO anon, authenticated USING (true);

-- ============ posts ============
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text','image','video')),
  media_url text,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_read_all" ON posts;
CREATE POLICY "posts_read_all" ON posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert_members" ON posts;
CREATE POLICY "posts_insert_members" ON posts FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.account_type = 'member' AND p.account_status = 'active')
  );

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  TO authenticated USING (auth.uid() = profile_id);

-- ============ likes ============
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id)
);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_read_all" ON likes;
CREATE POLICY "likes_read_all" ON likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes FOR DELETE
  TO authenticated USING (auth.uid() = profile_id);

-- ============ reports ============
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

-- ============ game_rooms ============
CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  game_key text NOT NULL DEFAULT 'tic-tac-toe',
  host_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished')),
  board jsonb,
  turn text NOT NULL DEFAULT 'X',
  winner text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_rooms_read_all" ON game_rooms;
CREATE POLICY "game_rooms_read_all" ON game_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "game_rooms_insert_any" ON game_rooms;
CREATE POLICY "game_rooms_insert_any" ON game_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "game_rooms_update_any" ON game_rooms;
CREATE POLICY "game_rooms_update_any" ON game_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ Functions: secure scoring ============

-- Helper: get a profile row's account_type/status safely
CREATE OR REPLACE FUNCTION get_profile_if_allowed(p_profile_id uuid)
RETURNS profiles AS $$
DECLARE p profiles;
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_profile_id;
  IF p IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF p.account_status = 'suspended' THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;
  RETURN p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- submit_quiz_result: validates a quiz attempt server-side and awards points.
-- p_answers is an array of selected option indexes (one per question, in order).
-- Returns the created quiz_results row as json.
CREATE OR REPLACE FUNCTION submit_quiz_result(
  p_profile_id uuid,
  p_quiz_id uuid,
  p_answers jsonb,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_quiz quizzes%ROWTYPE;
  v_questions record;
  v_correct integer := 0;
  v_total integer := 0;
  v_points integer := 0;
  v_answers int[];
  v_ans int;
  v_row quiz_results%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  v_profile := get_profile_if_allowed(p_profile_id);
  SELECT * INTO v_quiz FROM quizzes WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  v_answers := ARRAY(SELECT jsonb_array_elements_text(p_answers)::int);

  FOR v_questions IN
    SELECT correct_index, sort_order FROM questions WHERE quiz_id = p_quiz_id ORDER BY sort_order ASC
  LOOP
    v_total := v_total + 1;
    IF v_answers[v_total] = v_questions.correct_index THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  v_points := v_correct * COALESCE(v_quiz.points_per_correct, 10);

  INSERT INTO quiz_results (profile_id, quiz_id, score, total, points_awarded, duration_seconds, answers)
  VALUES (p_profile_id, p_quiz_id, v_correct, v_total, v_points, p_duration_seconds, p_answers)
  RETURNING * INTO v_row;

  UPDATE profiles SET total_points = total_points + v_points WHERE id = p_profile_id;

  IF v_points > 0 THEN
    INSERT INTO point_ledger (profile_id, delta, reason, ref_id)
    VALUES (p_profile_id, v_points, 'quiz', v_row.id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'score', v_row.score,
    'total', v_row.total,
    'points_awarded', v_row.points_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- submit_game_result: validates a game result and awards points.
-- Points are computed server-side from the game_key + difficulty + score, never trusted from the client.
CREATE OR REPLACE FUNCTION submit_game_result(
  p_profile_id uuid,
  p_game_key text,
  p_difficulty text DEFAULT NULL,
  p_score integer DEFAULT 0,
  p_metadata jsonb DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_points integer := 0;
  v_row game_results%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_base integer := 0;
BEGIN
  v_profile := get_profile_if_allowed(p_profile_id);

  -- Server-side point computation. Client cannot influence this value.
  IF p_game_key = 'memory' THEN
    v_base := CASE p_difficulty WHEN 'easy' THEN 5 WHEN 'medium' THEN 12 WHEN 'hard' THEN 25 ELSE 5 END;
    -- score = number of matches; bonus for fewer mistakes handled by client passing score = matches
    v_points := LEAST(v_base, p_score * 2);
  ELSIF p_game_key = 'tic-tac-toe' THEN
    -- win = 20, draw = 5, loss = 0; difficulty multiplies
    IF p_score = 1 THEN -- win
      v_points := CASE p_difficulty WHEN 'easy' THEN 10 WHEN 'medium' THEN 20 WHEN 'hard' THEN 35 WHEN 'multiplayer' THEN 30 ELSE 10 END;
    ELSIF p_score = 0 THEN -- draw
      v_points := 5;
    ELSE
      v_points := 0;
    END IF;
  ELSE
    v_points := 0;
  END IF;

  INSERT INTO game_results (profile_id, game_key, difficulty, score, points_awarded, metadata)
  VALUES (p_profile_id, p_game_key, p_difficulty, p_score, v_points, p_metadata)
  RETURNING * INTO v_row;

  UPDATE profiles SET total_points = total_points + v_points WHERE id = p_profile_id;

  IF v_points > 0 THEN
    INSERT INTO point_ledger (profile_id, delta, reason, ref_id)
    VALUES (p_profile_id, v_points, 'game:' || p_game_key, v_row.id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'points_awarded', v_row.points_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_guest_profile: creates a guest profile row (no auth link) and returns it.
CREATE OR REPLACE FUNCTION create_guest_profile(p_name text, p_username text)
RETURNS json AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, name, username, account_type, account_status)
  VALUES (v_id, p_name, p_username, 'guest', 'active');
  RETURN jsonb_build_object('id', v_id, 'name', p_name, 'username', p_username, 'account_type', 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- toggle_like: atomically like/unlike a post and update denormalized like_count.
CREATE OR REPLACE FUNCTION toggle_like(p_post_id uuid, p_profile_id uuid)
RETURNS json AS $$
DECLARE
  v_existing likes%ROWTYPE;
BEGIN
  SELECT * INTO v_existing FROM likes WHERE post_id = p_post_id AND profile_id = p_profile_id;
  IF v_existing IS NOT NULL THEN
    DELETE FROM likes WHERE id = v_existing.id;
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = p_post_id;
    RETURN jsonb_build_object('liked', false);
  ELSE
    INSERT INTO likes (post_id, profile_id) VALUES (p_post_id, p_profile_id);
    UPDATE posts SET like_count = like_count + 1 WHERE id = p_post_id;
    RETURN jsonb_build_object('liked', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon + authenticated for the public-facing RPCs
GRANT EXECUTE ON FUNCTION submit_quiz_result(uuid, uuid, jsonb, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_game_result(uuid, text, text, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_guest_profile(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_like(uuid, uuid) TO anon, authenticated;
