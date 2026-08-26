import { useEffect, useState } from 'react';
import { Users, Heart, Flag, Send, ImageIcon, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/Avatar';
import { FullScreenLoader, EmptyState, ErrorState } from '@/components/ui';
import { timeAgo } from '@/lib/storage';
import type { Post, Profile } from '@/lib/types';

interface PostWithProfile extends Post {
  profile?: Pick<Profile, 'name' | 'username' | 'avatar_url'>;
}

export function CommunityScreen() {
  const { profile, isGuest, isMember } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const loadPosts = async () => {
    setError(null);
    const { data, error: e } = await supabase
      .from('posts')
      .select('*, profile:profiles(name, username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (e) { setError(e.message); setPosts([]); return; }
    setPosts((data as PostWithProfile[]) ?? []);

    // Load my likes
    if (profile) {
      const { data: myLikes } = await supabase.from('likes').select('post_id').eq('profile_id', profile.id);
      if (myLikes) setLikedPosts(new Set(myLikes.map((l: { post_id: string }) => l.post_id)));
    }
  };

  useEffect(() => { loadPosts(); /* eslint-disable-next-line */ }, [profile?.id]);

  const handlePost = async () => {
    if (!caption.trim() || !profile || isGuest) return;
    setPosting(true);
    setError(null);
    const { error: e } = await supabase.from('posts').insert({
      profile_id: profile.id,
      caption: caption.trim(),
      media_type: 'text',
    });
    if (e) { setError(e.message); setPosting(false); return; }
    setCaption('');
    setPosting(false);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    if (!profile || isGuest) return;
    const { data, error: e } = await supabase.rpc('toggle_like', {
      p_post_id: postId,
      p_profile_id: profile.id,
    });
    if (e) return;
    const liked = (data as { liked: boolean }).liked;
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (liked) next.add(postId); else next.delete(postId);
      return next;
    });
    setPosts((prev) => prev?.map((p) => p.id === postId ? { ...p, like_count: p.like_count + (liked ? 1 : -1) } : p) ?? null);
  };

  const handleReport = async () => {
    if (!profile || !reporting || !reportReason.trim()) return;
    await supabase.from('reports').insert({
      reporter_id: profile.id,
      post_id: reporting,
      reason: reportReason.trim(),
    });
    setReporting(null);
    setReportReason('');
  };

  if (error && posts === null) return <ErrorState message={error} onRetry={loadPosts} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-success-400" />
        <h1 className="font-display text-2xl font-bold">Community</h1>
      </div>

      {isGuest && (
        <div className="flex items-start gap-3 rounded-xl border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-accent-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>You're browsing as a guest. You can read posts but cannot upload, post, or like. Become a member to participate.</p>
        </div>
      )}

      {/* Composer (members only) */}
      {isMember && (
        <div className="card p-4">
          <div className="flex gap-3">
            <Avatar name={profile?.username ?? 'me'} size={40} />
            <div className="flex-1">
              <textarea
                className="input min-h-[60px] resize-none"
                placeholder="Share something educational or fun…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
              />
              <div className="mt-2 flex items-center justify-between">
                <button disabled className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                  <ImageIcon className="h-4 w-4" /> Photo (soon)
                </button>
                <button onClick={handlePost} disabled={!caption.trim() || posting} className="btn-primary px-4 py-2 text-sm">
                  <Send className="h-4 w-4" /> {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {!posts ? <FullScreenLoader label="Loading feed…" /> : posts.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No posts yet" message="Be the first to share something with the community." />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="card p-4 animate-fade-up">
              <div className="flex items-center gap-3">
                <Avatar name={p.profile?.username ?? 'user'} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{p.profile?.name ?? 'Unknown'}</p>
                  <p className="truncate text-xs text-slate-400">@{p.profile?.username ?? 'user'} · {timeAgo(p.created_at)}</p>
                </div>
                {isMember && (
                  <button
                    onClick={() => setReporting(p.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-error-400"
                    title="Report"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
              </div>
              {p.caption && <p className="mt-3 text-sm text-slate-200">{p.caption}</p>}
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => handleLike(p.id)}
                  disabled={isGuest}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    likedPosts.has(p.id) ? 'text-error-400' : 'text-slate-400 hover:text-slate-200'
                  } ${isGuest ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${likedPosts.has(p.id) ? 'fill-current' : ''}`} />
                  {p.like_count}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report modal */}
      {reporting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => setReporting(null)}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl border border-white/10 bg-ink-900 p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold">Report post</h2>
            <p className="mt-1 text-sm text-slate-400">Help keep LightXZ safe. Reports are reviewed by moderators.</p>
            <textarea
              className="input mt-3 min-h-[80px] resize-none"
              placeholder="Why are you reporting this post?"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setReporting(null)} className="btn-ghost flex-1 py-2.5">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="btn-primary flex-1 py-2.5">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
