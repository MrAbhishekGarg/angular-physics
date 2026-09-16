/**
 * Content modules an admin can restrict a student from — checked via
 * utils/studentAccess.js#hasStudentAccess wherever a student's access to
 * that module is gated (test.service.js, worksheet.service.js,
 * note.service.js). Mirrors the display list in
 * frontend/src/data/studentAccessModules.js.
 */
export const STUDENT_ACCESS_MODULES = ['tests', 'worksheets', 'notes', 'doubts'];
