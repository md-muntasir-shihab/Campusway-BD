import { Router } from "express";
import { Parser as CsvParser } from "json2csv";
import ExcelJS from "exceljs";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { requireSensitiveAction, trackSensitiveExport } from "../../middlewares/sensitiveAction";
import Exam from "../../models/Exam";
import { ExamQuestionModel } from "../../models/examQuestion.model";
import ExamSession from "../../models/ExamSession";
import { PaymentModel } from "../../models/payment.model";
import { ResultModel } from "../../models/result.model";
import { SubscriptionModel } from "../../models/subscription.model";
import User from "../../models/User";

export const adminExamRoutes = Router();
adminExamRoutes.use(requireAuth, requireRole("admin", "moderator", "editor", "chairman"));

const requireDestructiveStepUp = (moduleName: string, actionName: string) => requireSensitiveAction({
  actionKey: 'data.destructive_change',
  moduleName,
  actionName,
});

const requireSensitiveExportStepUp = (moduleName: string, actionName: string) => requireSensitiveAction({
  actionKey: 'students.export',
  moduleName,
  actionName,
});

adminExamRoutes.get("/exams", async (_req, res) => res.json(await Exam.find().sort({ createdAt: -1 })));
adminExamRoutes.post("/exams", async (req, res) => res.json(await Exam.create(req.body)));
adminExamRoutes.get("/exams/:id", async (req, res) => res.json(await Exam.findById(req.params.id)));
adminExamRoutes.put("/exams/:id", async (req, res) => res.json(await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true })));
adminExamRoutes.delete("/exams/:id", requireDestructiveStepUp('exams', 'legacy_exam_delete'), async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.status(204).send(); });

adminExamRoutes.get("/exams/:id/questions", async (req, res) => res.json(await ExamQuestionModel.find({ examId: req.params.id }).sort({ orderIndex: 1 })));
adminExamRoutes.post("/exams/:id/questions", async (req, res) => res.json(await ExamQuestionModel.create({ ...req.body, examId: req.params.id })));
adminExamRoutes.put("/exams/:id/questions/:questionId", async (req, res) => res.json(await ExamQuestionModel.findByIdAndUpdate(req.params.questionId, req.body, { new: true })));
adminExamRoutes.delete("/exams/:id/questions/:questionId", requireDestructiveStepUp('exams', 'legacy_exam_question_delete'), async (req, res) => { await ExamQuestionModel.findByIdAndDelete(req.params.questionId); res.status(204).send(); });

adminExamRoutes.post("/exams/:id/questions/import/preview", async (req, res) => res.json({ ok: true, preview: req.body.rows || [] }));
adminExamRoutes.post("/exams/:id/questions/import/commit", async (req, res) => {
  const rows = (req.body.rows || []).map((r: any, i: number) => ({ ...r, examId: req.params.id, orderIndex: r.orderIndex ?? i + 1 }));
  const created = await ExamQuestionModel.insertMany(rows);
  res.json({ ok: true, count: created.length });
});

adminExamRoutes.get("/exams/:id/results", async (req, res) => res.json(await ResultModel.find({ examId: req.params.id }).sort({ obtainedMarks: -1 })));
adminExamRoutes.get("/exams/:id/exports", requireSensitiveExportStepUp('reports', 'legacy_exam_results_export'), trackSensitiveExport({ moduleName: 'reports', actionName: 'legacy_exam_results_export', targetType: 'exam', targetParam: 'id' }), async (req, res) => {
  const exam = await Exam.findById(req.params.id).lean();
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  const rows = await ResultModel.find({ examId: req.params.id })
    .populate("userId", "username fullName email phone")
    .sort({ obtainedMarks: -1 })
    .lean();
  const format = String(req.query.format || req.query.type || "csv").trim().toLowerCase() === "xlsx" ? "xlsx" : "csv";
  const exportRows = rows.map((r: any, i: number) => {
    const u = typeof r.userId === "object" ? r.userId : {};
    return {
      rank: r.rank || i + 1,
      name: u.fullName || u.username || "",
      email: u.email || "",
      obtainedMarks: r.obtainedMarks ?? "",
      totalMarks: r.totalMarks ?? "",
      percentage: r.percentage != null ? `${r.percentage}%` : "",
      correctCount: r.correctCount ?? "",
      wrongCount: r.wrongCount ?? "",
      skippedCount: r.skippedCount ?? "",
      timeTaken: r.timeTakenSeconds ?? "",
      submittedAt: r.submittedAtUTC ? new Date(r.submittedAtUTC).toLocaleString() : "",
    };
  });
  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CampusWay Admin";
    const ws = wb.addWorksheet("Results");
    ws.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Obtained", key: "obtainedMarks", width: 12 },
      { header: "Total", key: "totalMarks", width: 10 },
      { header: "Percentage", key: "percentage", width: 12 },
      { header: "Correct", key: "correctCount", width: 10 },
      { header: "Wrong", key: "wrongCount", width: 10 },
      { header: "Skipped", key: "skippedCount", width: 10 },
      { header: "Time (s)", key: "timeTaken", width: 12 },
      { header: "Submitted", key: "submittedAt", width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
    exportRows.forEach((row) => ws.addRow(row));
    const title = String(exam.title || "exam").replace(/[^a-z0-9]/gi, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${title}_results.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  }
  const title = String(exam.title || "exam").replace(/[^a-z0-9]/gi, "_");
  const csv = new CsvParser().parse(exportRows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${title}_results.csv"`);
  res.send(csv);
});
adminExamRoutes.post("/exams/:id/publish-results", async (req, res) => res.json(await Exam.findByIdAndUpdate(req.params.id, { resultPublishAtUTC: new Date() }, { new: true })));
adminExamRoutes.post("/exams/:id/reset-attempt", async (req, res) => {
  const userId = req.body.userId as string;
  await ExamSession.deleteMany({ examId: req.params.id, userId });
  res.json({ ok: true });
});

adminExamRoutes.get("/payments", async (_req, res) => res.json(await PaymentModel.find().sort({ createdAt: -1 })));
adminExamRoutes.put("/payments/:id/verify", async (req, res) => res.json(await PaymentModel.findByIdAndUpdate(req.params.id, { status: "paid", verifiedByAdminId: req.user!.id, paidAt: new Date(), notes: req.body.notes }, { new: true })));

adminExamRoutes.get("/students", async (_req, res) => res.json(await User.find({ role: "student" })));
adminExamRoutes.post("/students/import", async (req, res) => res.json({ ok: true, rows: (req.body.rows || []).length }));
adminExamRoutes.get("/students/export", requireSensitiveExportStepUp('students_groups', 'legacy_students_export'), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'legacy_students_export' }), async (_req, res) => {
  const csv = new CsvParser().parse(await User.find({ role: "student" }).lean());
  res.type("text/csv").send(csv);
});

adminExamRoutes.get("/student-groups", async (_req, res) => res.json([]));
adminExamRoutes.post("/student-groups/import", async (req, res) => res.json({ ok: true, rows: req.body.rows?.length || 0 }));

adminExamRoutes.get("/question-bank", async (_req, res) => res.json([]));

adminExamRoutes.get("/exams/:id/questions/template.xlsx", async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Questions");
  ws.columns = [
    { header: "question_en", key: "question_en", width: 40 },
    { header: "question_bn", key: "question_bn", width: 40 },
    { header: "optionA_en", key: "optionA_en", width: 20 },
    { header: "optionA_bn", key: "optionA_bn", width: 20 },
    { header: "optionB_en", key: "optionB_en", width: 20 },
    { header: "optionB_bn", key: "optionB_bn", width: 20 },
    { header: "optionC_en", key: "optionC_en", width: 20 },
    { header: "optionC_bn", key: "optionC_bn", width: 20 },
    { header: "optionD_en", key: "optionD_en", width: 20 },
    { header: "optionD_bn", key: "optionD_bn", width: 20 },
    { header: "correctKey", key: "correctKey", width: 10 },
    { header: "marks", key: "marks", width: 8 },
    { header: "negativeMarks", key: "negativeMarks", width: 12 },
    { header: "explanation_en", key: "explanation_en", width: 30 },
    { header: "explanation_bn", key: "explanation_bn", width: 30 },
    { header: "questionImageUrl", key: "questionImageUrl", width: 25 },
    { header: "explanationImageUrl", key: "explanationImageUrl", width: 25 },
  ];
  ws.addRow({ question_en: "What is 2+2?", optionA_en: "3", optionB_en: "4", optionC_en: "5", optionD_en: "6", correctKey: "B", marks: 1 });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="questions_template.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});
adminExamRoutes.get("/students/template.xlsx", async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students");
  ws.columns = [
    { header: "userId", key: "userId", width: 15 },
    { header: "username", key: "username", width: 15 },
    { header: "fullName", key: "fullName", width: 25 },
    { header: "phone", key: "phone", width: 15 },
    { header: "email", key: "email", width: 25 },
    { header: "department", key: "department", width: 15 },
    { header: "sscBatch", key: "sscBatch", width: 10 },
    { header: "hscBatch", key: "hscBatch", width: 10 },
    { header: "collegeName", key: "collegeName", width: 25 },
  ];
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="students_template.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});
adminExamRoutes.get("/student-groups/template.xlsx", async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Groups");
  ws.columns = [
    { header: "groupName", key: "groupName", width: 25 },
    { header: "userId", key: "userId", width: 15 },
    { header: "username", key: "username", width: 15 },
  ];
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="student_groups_template.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});
