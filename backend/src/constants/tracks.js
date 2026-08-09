/**
 * Shared exam-track enum, reused by Course, Note, Question, Test, and
 * Testimonial so every schema stays in sync instead of duplicating the
 * list. 'iit-jee' was split into 'jee-main'/'jee-advanced' — existing data
 * was migrated to 'jee-main' (see the one-off migration run during that
 * change; there is no permanent migration script since this only needed
 * to run once against already-existing documents).
 */
export const TRACKS = ['jee-main', 'jee-advanced', 'neet', 'olympiad', 'foundation', 'crash-course'];
