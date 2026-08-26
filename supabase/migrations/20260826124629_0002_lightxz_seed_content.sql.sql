INSERT INTO classes (name, slug, description, color, icon, sort_order) VALUES
('Class 6', 'class-6', 'Foundations across core subjects', '#3b82f6', 'GraduationCap', 1),
('Class 7', 'class-7', 'Building deeper understanding', '#10b981', 'BookOpen', 2),
('Class 8', 'class-8', 'Pre-board fundamentals', '#f59e0b', 'Calculator', 3),
('Class 9', 'class-9', 'Advanced concepts begin', '#ef4444', 'Atom', 4),
('Class 10', 'class-10', 'Board-level mastery', '#8b5cf6', 'Trophy', 5)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  c6 uuid := (SELECT id FROM classes WHERE slug='class-6');
  c7 uuid := (SELECT id FROM classes WHERE slug='class-7');
  c8 uuid := (SELECT id FROM classes WHERE slug='class-8');
  c9 uuid := (SELECT id FROM classes WHERE slug='class-9');
  c10 uuid := (SELECT id FROM classes WHERE slug='class-10');
BEGIN
  INSERT INTO subjects (class_id, name, slug, description, icon, color, sort_order) VALUES
  (c6, 'Mathematics', 'math', 'Numbers and basic operations', 'Calculator', '#3b82f6', 1),
  (c6, 'Science', 'science', 'The world around us', 'Atom', '#10b981', 2),
  (c6, 'English', 'english', 'Language and grammar', 'BookOpen', '#f59e0b', 3),
  (c7, 'Mathematics', 'math', 'Fractions and algebra basics', 'Calculator', '#3b82f6', 1),
  (c7, 'Science', 'science', 'Living world and energy', 'Atom', '#10b981', 2),
  (c7, 'Social Studies', 'social', 'History and geography', 'Globe', '#ef4444', 3),
  (c8, 'Mathematics', 'math', 'Linear equations and geometry', 'Calculator', '#3b82f6', 1),
  (c8, 'Science', 'science', 'Matter, force, and energy', 'Atom', '#10b981', 2),
  (c8, 'English', 'english', 'Literature and writing', 'BookOpen', '#f59e0b', 3),
  (c9, 'Mathematics', 'math', 'Polynomials and coordinate geometry', 'Calculator', '#3b82f6', 1),
  (c9, 'Science', 'science', 'Atoms, cells, and motion', 'Atom', '#10b981', 2),
  (c9, 'Social Studies', 'social', 'Modern history and civics', 'Globe', '#ef4444', 3),
  (c10, 'Mathematics', 'math', 'Trigonometry and quadratic equations', 'Calculator', '#3b82f6', 1),
  (c10, 'Science', 'science', 'Light, electricity, and heredity', 'Atom', '#10b981', 2),
  (c10, 'English', 'english', 'Prose, poetry, and composition', 'BookOpen', '#f59e0b', 3)
  ON CONFLICT (class_id, slug) DO NOTHING;
END $$;

DO $$
DECLARE
  s6math uuid := (SELECT id FROM subjects WHERE slug='math' AND class_id=(SELECT id FROM classes WHERE slug='class-6'));
  s6sci  uuid := (SELECT id FROM subjects WHERE slug='science' AND class_id=(SELECT id FROM classes WHERE slug='class-6'));
  s10math uuid := (SELECT id FROM subjects WHERE slug='math' AND class_id=(SELECT id FROM classes WHERE slug='class-10'));
  q1 uuid; q2 uuid; q3 uuid;
BEGIN
  INSERT INTO revision_materials (subject_id, title, body, sort_order) VALUES
  (s6math, 'Whole Numbers', 'Whole numbers are 0,1,2,3... They include zero and all natural numbers. Operations: addition, subtraction, multiplication, division.', 1),
  (s6math, 'Fractions', 'A fraction represents a part of a whole. It has a numerator (top) and denominator (bottom). Example: 3/4 means three parts out of four.', 2),
  (s6sci, 'Living Things', 'Living things grow, breathe, reproduce, and respond to stimuli. Plants and animals are living organisms.', 1),
  (s6sci, 'The Solar System', 'The Sun and eight planets form our solar system. Planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.', 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO quizzes (id, subject_id, title, description, difficulty, time_limit_seconds, points_per_correct)
  VALUES (gen_random_uuid(), s6math, 'Whole Numbers Quiz', 'Test your basics of whole numbers', 'easy', 60, 10)
  RETURNING id INTO q1;

  INSERT INTO questions (quiz_id, question_text, options, correct_index, sort_order) VALUES
  (q1, 'Which is the smallest whole number?', '["0","1","2","10"]', 0, 1),
  (q1, 'What is 7 + 3?', '["9","10","11","12"]', 1, 2),
  (q1, 'What is 12 - 4?', '["6","7","8","9"]', 2, 3),
  (q1, 'Which is a natural number?', '["0","1.5","3","-2"]', 2, 4),
  (q1, 'What is 5 x 6?', '["25","30","35","40"]', 1, 5);

  INSERT INTO quizzes (id, subject_id, title, description, difficulty, time_limit_seconds, points_per_correct)
  VALUES (gen_random_uuid(), s6sci, 'Living Things Quiz', 'Basics of living organisms', 'easy', 60, 10)
  RETURNING id INTO q2;

  INSERT INTO questions (quiz_id, question_text, options, correct_index, sort_order) VALUES
  (q2, 'Which is a living thing?', '["Rock","Water","Tree","Air"]', 2, 1),
  (q2, 'What do living things need to survive?', '["Nothing","Food and water","Only sunlight","Only air"]', 1, 2),
  (q2, 'Which process do plants use to make food?', '["Respiration","Photosynthesis","Digestion","Reproduction"]', 1, 3),
  (q2, 'How many planets are in our solar system?', '["7","8","9","10"]', 1, 4),
  (q2, 'Which is the closest planet to the Sun?', '["Earth","Venus","Mercury","Mars"]', 2, 5);

  INSERT INTO quizzes (id, subject_id, title, description, difficulty, time_limit_seconds, points_per_correct)
  VALUES (gen_random_uuid(), s10math, 'Quadratic Equations', 'Test your quadratic skills', 'hard', 120, 20)
  RETURNING id INTO q3;

  INSERT INTO questions (quiz_id, question_text, options, correct_index, sort_order) VALUES
  (q3, 'The roots of x^2 - 5x + 6 = 0 are:', '["2 and 3","1 and 6","-2 and -3","5 and 6"]', 0, 1),
  (q3, 'The discriminant of x^2 + 4x + 4 = 0 is:', '["0","16","8","4"]', 0, 2),
  (q3, 'If x^2 = 9, x equals:', '["3","-3","3 or -3","9"]', 2, 3),
  (q3, 'The sum of roots of x^2 - 7x + 10 = 0 is:', '["7","10","-7","3"]', 0, 4),
  (q3, 'Which is a quadratic equation?', '["2x + 1 = 0","x^2 + 3x = 0","x^3 = 1","x = 5"]', 1, 5);
END $$;