import {
  GraduationCap, BookOpen, Calculator, Atom, Trophy, Globe,
  FlaskConical, Languages, Music, Palette, Code2, Brain,
  Lightbulb, Star, Award, Zap, Target, Crown, Medal,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap, BookOpen, Calculator, Atom, Trophy, Globe,
  FlaskConical, Languages, Music, Palette, Code2, Brain,
  Lightbulb, Star, Award, Zap, Target, Crown, Medal,
};

export function SubjectIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? BookOpen;
  return <Icon className={className} />;
}
