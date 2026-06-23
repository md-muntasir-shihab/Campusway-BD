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

// Bangladesh conversion for O/A Level
export const OA_GRADE_TABLE = [
  { grade: "A*", point: 5.0 },
  { grade: "A", point: 5.0 },
  { grade: "B", point: 4.0 },
  { grade: "C", point: 3.0 },
  { grade: "D", point: 2.0 },
  { grade: "E", point: 1.0 },
];

export const OA_GRADES = ["A*", "A", "B", "C", "D", "E"];

export function gradeToPointOA(grade: string): number {
  const row = OA_GRADE_TABLE.find((r) => r.grade === grade);
  return row ? row.point : 0;
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
