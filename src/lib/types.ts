export type AccountType = 'member' | 'guest';
export type AccountStatus = 'active' | 'restricted' | 'suspended';

export interface Profile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  account_type: AccountType;
  account_status: AccountStatus;
  total_points: number;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
}

export interface RevisionMaterial {
  id: string;
  subject_id: string;
  title: string;
  body: string;
  sort_order: number;
}

export interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_seconds: number | null;
  points_per_correct: number;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

export interface QuizResult {
  id: string;
  profile_id: string;
  quiz_id: string;
  score: number;
  total: number;
  points_awarded: number;
  duration_seconds: number | null;
  answers: number[];
  created_at: string;
}

export interface GameResult {
  id: string;
  profile_id: string;
  game_key: string;
  difficulty: string | null;
  score: number;
  points_awarded: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Post {
  id: string;
  profile_id: string;
  caption: string;
  media_type: 'text' | 'image' | 'video';
  media_url: string | null;
  like_count: number;
  created_at: string;
  profile?: Pick<Profile, 'name' | 'username' | 'avatar_url'>;
}

export interface Like {
  id: string;
  post_id: string;
  profile_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  post_id: string;
  reason: string;
  status: 'open' | 'reviewing' | 'resolved';
  created_at: string;
}

export interface PointLedgerEntry {
  id: string;
  profile_id: string;
  delta: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export interface GameRoom {
  id: string;
  code: string;
  game_key: string;
  host_id: string | null;
  guest_id: string | null;
  status: 'waiting' | 'active' | 'finished';
  board: (string | null)[];
  turn: 'X' | 'O';
  winner: string | null;
  created_at: string;
}

export interface SubmitQuizResultResponse {
  id: string;
  score: number;
  total: number;
  points_awarded: number;
}

export interface SubmitGameResultResponse {
  id: string;
  points_awarded: number;
}
