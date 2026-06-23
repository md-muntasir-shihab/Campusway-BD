export interface Course {
  id: string;
  name: string;
  credits: number;
  grade: string;
  gradePoint: number;
}

export interface Semester {
  id: string;
  name: string;
  courses: Course[];
  sgpa: number;
  totalCredits: number;
}

export interface CGPAResult {
  cgpa: number;
  totalCredits: number;
  degreeClass: string;
  degreeClassBn: string;
  semesters: Semester[];
}

// Variant A — Public University
export const PUBLIC_GRADE_TABLE = [
  { minMark: 80, maxMark: 100, grade: "A+", point: 4.0 },
  { minMark: 75, maxMark: 79, grade: "A", point: 3.75 },
  { minMark: 70, maxMark: 74, grade: "A-", point: 3.5 },
  { minMark: 65, maxMark: 69, grade: "B+", point: 3.25 },
  { minMark: 60, maxMark: 64, grade: "B", point: 3.0 },
  { minMark: 55, maxMark: 59, grade: "B-", point: 2.75 },
  { minMark: 50, maxMark: 54, grade: "C+", point: 2.5 },
  { minMark: 45, maxMark: 49, grade: "C", point: 2.25 },
  { minMark: 40, maxMark: 44, grade: "D", point: 2.0 },
  { minMark: 0, maxMark: 39, grade: "F", point: 0.0 },
];

// Variant B — Private University
export const PRIVATE_GRADE_TABLE = [
  { minMark: 97, maxMark: 100, grade: "A+", point: 4.0 },
  { minMark: 90, maxMark: 96, grade: "A", point: 4.0 },
  { minMark: 85, maxMark: 89, grade: "A-", point: 3.7 },
  { minMark: 80, maxMark: 84, grade: "B+", point: 3.3 },
  { minMark: 75, maxMark: 79, grade: "B", point: 3.0 },
  { minMark: 70, maxMark: 74, grade: "B-", point: 2.7 },
  { minMark: 65, maxMark: 69, grade: "C+", point: 2.3 },
  { minMark: 60, maxMark: 64, grade: "C", point: 2.0 },
  { minMark: 50, maxMark: 59, grade: "D", point: 1.0 },
  { minMark: 0, maxMark: 49, grade: "F", point: 0.0 },
];

export const ALL_UNIVERSITY_GRADES = {
  public: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"],
  private: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"],
};

export function gradeToPointUniversity(grade: string, isPrivate: boolean): number {
  const table = isPrivate ? PRIVATE_GRADE_TABLE : PUBLIC_GRADE_TABLE;
  const row = table.find((r) => r.grade === grade);
  return row ? row.point : 0.0;
}

export function calculateSGPA(courses: Course[]): number {
  const totalWeighted = courses.reduce(
    (sum, c) => sum + c.gradePoint * c.credits,
    0
  );
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits === 0) return 0;
  return Math.round((totalWeighted / totalCredits) * 100) / 100;
}

export function calculateCGPA(semesters: Semester[]): number {
  const totalWeighted = semesters.reduce(
    (sum, s) => sum + s.sgpa * s.totalCredits,
    0
  );
  const totalCredits = semesters.reduce((sum, s) => sum + s.totalCredits, 0);
  if (totalCredits === 0) return 0;
  return Math.round((totalWeighted / totalCredits) * 100) / 100;
}

export function getDegreeClass(cgpa: number): { en: string; bn: string } {
  if (cgpa >= 3.5) return { en: "First Class (Excellent)", bn: "প্রথম শ্রেণী (অনার্স)" };
  if (cgpa >= 3.0) return { en: "First Class", bn: "প্রথম শ্রেণী" };
  if (cgpa >= 2.25) return { en: "Second Class", bn: "দ্বিতীয় শ্রেণী" };
  if (cgpa >= 2.0) return { en: "Third Class", bn: "তৃতীয় শ্রেণী" };
  return { en: "Probation / No Degree", bn: "প্রবেশন" };
}
