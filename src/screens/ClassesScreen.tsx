import { useEffect, useState } from 'react';
import { ChevronRight, BookOpen, HelpCircle, FileText, ArrowLeft, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import { SubjectIcon } from '@/components/SubjectIcon';
import { SkeletonList, EmptyState } from '@/components/ui';
import type { ClassRoom, Subject, RevisionMaterial, Quiz } from '@/lib/types';

export function ClassesScreen() {
  const { view, viewParams, navigate, goBack } = useNav();
  const [classes, setClasses] = useState<ClassRoom[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('classes').select('*').order('sort_order');
      setClasses((data as ClassRoom[]) ?? []);
    })();
  }, []);

  if (view === 'subject') {
    return <SubjectView subjectId={viewParams?.id ?? ''} onBack={goBack} />;
  }

  if (view === 'class') {
    return <ClassView classId={viewParams?.id ?? ''} onBack={goBack} onSubject={(id) => navigate('subject', { id })} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-brand-400" />
        <h1 className="font-display text-2xl font-bold">Classes</h1>
      </div>
      <p className="text-sm text-slate-400">Pick a class to explore subjects, revision material, and quizzes.</p>

      {!classes ? <SkeletonList count={5} /> : classes.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-8 w-8" />} title="No classes yet" message="Check back soon — new classes are being added." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c, i) => (
            <button
              key={c.id}
              onClick={() => navigate('class', { id: c.id })}
              className="card card-hover group relative overflow-hidden p-5 text-left animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: c.color }} />
              <div className="relative flex items-start gap-4">
                <div className="rounded-2xl p-3" style={{ backgroundColor: `${c.color}22` }}>
                  <SubjectIcon name={c.icon} className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold">{c.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-400">{c.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassView({ classId, onBack, onSubject }: { classId: string; onBack: () => void; onSubject: (id: string) => void }) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subjects').select('*').eq('class_id', classId).order('sort_order');
      setSubjects((data as Subject[]) ?? []);
    })();
  }, [classId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Classes
      </button>
      <h1 className="font-display text-2xl font-bold">Subjects</h1>

      {!subjects ? <SkeletonList count={4} /> : subjects.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title="No subjects yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSubject(s.id)}
              className="card card-hover group flex items-center gap-3 p-4 text-left animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rounded-xl p-2.5" style={{ backgroundColor: `${s.color}22` }}>
                <SubjectIcon name={s.icon} className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-slate-400">{s.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectView({ subjectId, onBack }: { subjectId: string; onBack: () => void }) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [revision, setRevision] = useState<RevisionMaterial[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const { navigate } = useNav();

  useEffect(() => {
    (async () => {
      const [s, r, q] = await Promise.all([
        supabase.from('subjects').select('*').eq('id', subjectId).maybeSingle(),
        supabase.from('revision_materials').select('*').eq('subject_id', subjectId).order('sort_order'),
        supabase.from('quizzes').select('*').eq('subject_id', subjectId),
      ]);
      setSubject(s.data as Subject | null);
      setRevision((r.data as RevisionMaterial[]) ?? []);
      setQuizzes((q.data as Quiz[]) ?? []);
    })();
  }, [subjectId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {subject && (
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: `${subject.color}22` }}>
            <SubjectIcon name={subject.icon} className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{subject.name}</h1>
            <p className="text-sm text-slate-400">{subject.description}</p>
          </div>
        </div>
      )}

      {/* Revision */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
          <FileText className="h-4 w-4" /> Revision material
        </h2>
        {!revision ? <SkeletonList count={2} /> : revision.length === 0 ? (
          <p className="text-sm text-slate-500">No revision material yet.</p>
        ) : (
          <div className="space-y-3">
            {revision.map((r) => (
              <div key={r.id} className="card p-4">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quizzes */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
          <HelpCircle className="h-4 w-4" /> Quizzes
        </h2>
        {!quizzes ? <SkeletonList count={2} /> : quizzes.length === 0 ? (
          <p className="text-sm text-slate-500">No quizzes yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate('quiz', { id: q.id })}
                className="card card-hover p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{q.title}</h3>
                  <span className={`badge ${
                    q.difficulty === 'easy' ? 'bg-success-500/15 text-success-400' :
                    q.difficulty === 'medium' ? 'bg-warning-500/15 text-warning-400' :
                    'bg-error-500/15 text-error-400'
                  }`}>{q.difficulty}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{q.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  {q.time_limit_seconds && <span>⏱ {q.time_limit_seconds}s</span>}
                  <span>+{q.points_per_correct} pts/question</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
