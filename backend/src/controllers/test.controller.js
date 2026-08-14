import * as testService from '../services/test.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { generateTestPdf } from '../services/testPdf.service.js';
import { assertCanManagePaidContent } from '../utils/mentorAccess.js';

export const listTestsMentor = asyncHandler(async (req, res) => {
  const tests = await testService.getAllTestsForMentor();
  return ApiResponse(res, 200, tests, { count: tests.length });
});

export const getTestMentor = asyncHandler(async (req, res) => {
  const test = await testService.getTestByIdForMentor(req.params.id);
  return ApiResponse(res, 200, test);
});

export const createTest = asyncHandler(async (req, res) => {
  if (req.body.isPaid) assertCanManagePaidContent(req.user);
  const test = await testService.createTest(req.body);
  return ApiResponse(res, 201, test);
});

export const updateTest = asyncHandler(async (req, res) => {
  if (req.user.role === 'mentor' && req.user.canManagePaidContent === false) {
    const { isPaid: currentIsPaid } = await testService.getTestPaidStatus(req.params.id);
    const nextIsPaid = req.body.isPaid !== undefined ? req.body.isPaid : currentIsPaid;
    if (currentIsPaid || nextIsPaid) assertCanManagePaidContent(req.user);
  }
  const test = await testService.updateTest(req.params.id, req.body);
  return ApiResponse(res, 200, test);
});

export const deleteTest = asyncHandler(async (req, res) => {
  if (req.user.role === 'mentor' && req.user.canManagePaidContent === false) {
    const { isPaid } = await testService.getTestPaidStatus(req.params.id);
    if (isPaid) assertCanManagePaidContent(req.user);
  }
  await testService.deleteTest(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const listAvailableTests = asyncHandler(async (req, res) => {
  const tests = await testService.getAvailableTestsForStudent(req.user.id);
  return ApiResponse(res, 200, tests, { count: tests.length });
});

export const startAttempt = asyncHandler(async (req, res) => {
  const result = await testService.startAttempt(req.user.id, req.params.id, req.user.role);
  return ApiResponse(res, 200, result);
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await testService.submitAttempt(req.params.attemptId, req.user.id, req.body);
  return ApiResponse(res, 200, attempt);
});

export const saveAttemptProgress = asyncHandler(async (req, res) => {
  const result = await testService.saveAttemptProgress(req.params.attemptId, req.user.id, req.body.answers);
  return ApiResponse(res, 200, result);
});

export const listAttemptsForTest = asyncHandler(async (req, res) => {
  const attempts = await testService.getAttemptsForTest(req.params.id);
  return ApiResponse(res, 200, attempts, { count: attempts.length });
});

export const getAttendanceForTest = asyncHandler(async (req, res) => {
  const attendance = await testService.getAttendanceForTest(req.params.id);
  return ApiResponse(res, 200, attendance, { count: attendance.length });
});

export const getQuestionAnalysisForTest = asyncHandler(async (req, res) => {
  const analysis = await testService.getQuestionAnalysisForTest(req.params.id);
  return ApiResponse(res, 200, analysis, { count: analysis.length });
});

export const listMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await testService.getMyAttempts(req.user.id);
  return ApiResponse(res, 200, attempts, { count: attempts.length });
});

export const getAttemptResult = asyncHandler(async (req, res) => {
  const result = await testService.getAttemptResult(req.params.attemptId, req.user);
  return ApiResponse(res, 200, result);
});

export const resetAttempt = asyncHandler(async (req, res) => {
  const attempt = await testService.resetAttempt(req.params.attemptId);
  return ApiResponse(res, 200, attempt);
});

export const createPracticeTest = asyncHandler(async (req, res) => {
  const result = await testService.createPracticeTest(req.user.id, req.body);
  return ApiResponse(res, 201, result);
});

export const downloadTestPdf = asyncHandler(async (req, res) => {
  const test = await testService.getTestByIdForMentor(req.params.id);
  if (test.questions.length === 0) throw new ApiError(400, 'Add at least one question before downloading the PDF');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${test.title.replace(/[^\w\- ]/g, '')}.pdf"`);
  // A test's questions/answers can change after a mentor edits it — a stale
  // browser-cached copy of "the same URL" must never win over a re-generated one.
  res.setHeader('Cache-Control', 'no-store');
  generateTestPdf(test).pipe(res);
});

export const downloadTestAnswerPdf = asyncHandler(async (req, res) => {
  const test = await testService.getTestByIdForMentor(req.params.id);
  if (test.questions.length === 0) throw new ApiError(400, 'Add at least one question before downloading the PDF');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${test.title.replace(/[^\w\- ]/g, '')} - Answer Key.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  generateTestPdf(test, { includeAnswers: true }).pipe(res);
});
