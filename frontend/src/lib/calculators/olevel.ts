export interface OLevelSubject {
  id: string;
  name: string;
  grade: string;
  point: number;
}

export interface OLevelResult {
  subjects: OLevelSubject[];
  avgGPA: number;
  isEligible: boolean;
  reason?: string;
}

export interface ALevelResult {
  subjects: OLevelSubject[];
  avgGPA: number;
  isEligible: boolean;
  reason?: string;
}

export interface CombinedOAResult {
  oLevel: OLevelResult;
  aLevel: ALevelResult;
  combinedGPA: number;
}

/** A grade-table row, shaped to match the DB-driven CalculatorGrading model. */
export interface GradeRow {
  minMark: number;
  maxMark: number;
  grade: string;
  point: number;
}

// Bangladesh conversion for O/A Level (fallback when no DB table is supplied)
export const OA_GRADE_TABLE: GradeRow[] = [
  { minMark: 0, maxMark: 0, grade: "A*", point: 5.0 },
  { minMark: 0, maxMark: 0, grade: "A", point: 5.0 },
  { minMark: 0, maxMark: 0, grade: "B", point: 4.0 },
  { minMark: 0, maxMark: 0, grade: "C", point: 3.0 },
  { minMark: 0, maxMark: 0, grade: "D", point: 2.0 },
  { minMark: 0, maxMark: 0, grade: "E", point: 1.0 },
];

function resolveTable(table?: GradeRow[]): GradeRow[] {
  return table && table.length > 0 ? table : OA_GRADE_TABLE;
}

/** Grade letters for O/A-Level dropdowns, derived from the supplied table or the default. */
export const OA_GRADES = ["A*", "A", "B", "C", "D", "E"];

/** Resolve an O/A-Level grade letter to its point, optionally using an admin-defined table. */
export function gradeToPointOA(grade: string, table?: GradeRow[]): number {
  const row = resolveTable(table).find((r) => r.grade === grade);
  return row ? row.point : 0;
}

/** The list of O/A-Level grade letters from the supplied table or the default. */
export function oaGradeLetters(table?: GradeRow[]): string[] {
  return resolveTable(table).map((r) => r.grade);
}

export function calculateOLevel(subjects: OLevelSubject[]): OLevelResult {
  if (subjects.length < 5) {
    return {
      subjects,
      avgGPA: 0,
      isEligible: false,
      reason: "Minimum 5 subjects required for O-Level",
    };
  }

  const best5 = [...subjects]
    .sort((a, b) => b.point - a.point)
    .slice(0, 5);
  const avg = best5.reduce((sum, s) => sum + s.point, 0) / 5;
  const rounded = Math.round(avg * 100) / 100;

  if (rounded < 2.5) {
    return {
      subjects,
      avgGPA: rounded,
      isEligible: false,
      reason: "Minimum average GPA of 2.50 required",
    };
  }

  return { subjects, avgGPA: rounded, isEligible: true };
}

export function calculateALevel(subjects: OLevelSubject[]): ALevelResult {
  if (subjects.length < 2) {
    return {
      subjects,
      avgGPA: 0,
      isEligible: false,
      reason: "Minimum 2 subjects required for A-Level",
    };
  }

  const eCount = subjects.filter((s) => s.grade === "E").length;
  if (eCount > 1) {
    return {
      subjects,
      avgGPA: 0,
      isEligible: false,
      reason: "Maximum 1 subject with grade E allowed",
    };
  }

  const best2 = [...subjects]
    .sort((a, b) => b.point - a.point)
    .slice(0, 2);
  const avg = best2.reduce((sum, s) => sum + s.point, 0) / 2;
  const rounded = Math.round(avg * 100) / 100;

  if (rounded < 2.0) {
    return {
      subjects,
      avgGPA: rounded,
      isEligible: false,
      reason: "Minimum average GPA of 2.00 required",
    };
  }

  return { subjects, avgGPA: rounded, isEligible: true };
}

export function calculateCombinedOA(
  oResult: OLevelResult,
  aResult: ALevelResult
): number {
  const combined = (oResult.avgGPA * 5 + aResult.avgGPA * 2) / 7;
  return Math.round(combined * 100) / 100;
}
