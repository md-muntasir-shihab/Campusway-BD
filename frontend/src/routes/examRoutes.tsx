import { RouteObject } from "react-router-dom";
import { ExamsListPage } from "../pages/exams/ExamsListPage";
import { ExamRunnerPage } from "../pages/exams/ExamRunnerPage";
import { ExamResultPage } from "../pages/exams/ExamResultPage";
import { ExamSolutionsPage } from "../pages/exams/ExamSolutionsPage";

export const examRoutes: RouteObject[] = [
  { path: "/exams", element: <ExamsListPage /> },
  { path: "/exam/:examId", element: <ExamRunnerPage /> },
  { path: "/exam/:examId/result", element: <ExamResultPage /> },
  { path: "/exam/:examId/solutions", element: <ExamSolutionsPage /> }
];
