export interface SubjectResult {
  name: string;
  marks?: number;
  grade?: string;
  gradePoint: number;
  isMandatory: boolean;
  isOptional?: boolean;
}

export interface GPAResult {
  gpa: number;
  letterGrade: string;
  isGoldenAPlus: boolean;
  isPassed: boolean;
  subjects: SubjectResult[];
  failedSubjects: string[];
}

// Official Bangladesh Board Grade Table
export const BD_GRADE_TABLE = [
  { minMark: 80, maxMark: 100, grade: "A+", point: 5.0 },
  { minMark: 70, maxMark: 79, grade: "A", point: 4.0 },
  { minMark: 60, maxMark: 69, grade: "A-", point: 3.5 },
  { minMark: 50, maxMark: 59, grade: "B", point: 3.0 },
  { minMark: 40, maxMark: 49, grade: "C", point: 2.0 },
  { minMark: 33, maxMark: 39, grade: "D", point: 1.0 },
  { minMark: 0, maxMark: 32, grade: "F", point: 0.0 },
];

export function marksToGrade(marks: number): { grade: string; point: number } {
  for (const row of BD_GRADE_TABLE) {
    if (marks >= row.minMark && marks <= row.maxMark) {
      return { grade: row.grade, point: row.point };
    }
  }
  return { grade: "F", point: 0.0 };
}

export function gradeToPoint(grade: string): number {
  const row = BD_GRADE_TABLE.find((r) => r.grade === grade);
  return row ? row.point : 0.0;
}

export function calculateSSCHSCGPA(
  mainSubjects: { name: string; marks: number; isMandatory: boolean }[],
  optionalSubject?: { name: string; marks: number }
): GPAResult {
  const subjects: SubjectResult[] = mainSubjects.map((s) => {
    const { grade, point } = marksToGrade(s.marks);
    return {
      name: s.name,
      marks: s.marks,
      grade,
      gradePoint: point,
      isMandatory: s.isMandatory,
    };
  });

  const failedMandatory = subjects.filter(
    (s) => s.isMandatory && s.gradePoint === 0
  );
  const failedSubjects = failedMandatory.map((s) => s.name);

  if (failedMandatory.length > 0) {
    return {
      gpa: 0,
      letterGrade: "F",
      isGoldenAPlus: false,
      isPassed: false,
      subjects,
      failedSubjects,
    };
  }

  let totalPoints = subjects.reduce((sum, s) => sum + s.gradePoint, 0);
  const mainCount = subjects.length;

  // 4th subject bonus
  let optionalResult: SubjectResult | undefined;
  if (optionalSubject) {
    const { grade, point } = marksToGrade(optionalSubject.marks);
    const bonus = point > 2.0 ? point - 2.0 : 0;
    totalPoints += bonus;
    optionalResult = {
      name: optionalSubject.name,
      marks: optionalSubject.marks,
      grade,
      gradePoint: point,
      isMandatory: false,
      isOptional: true,
    };
  }

  let gpa = totalPoints / mainCount;
  gpa = Math.min(5.0, gpa);
  gpa = Math.round(gpa * 100) / 100;

  const isGoldenAPlus =
    gpa === 5.0 && subjects.every((s) => s.gradePoint === 5.0);

  const letterGrade =
    gpa >= 5.0
      ? "A+"
      : gpa >= 4.0
      ? "A"
      : gpa >= 3.5
      ? "A-"
      : gpa >= 3.0
      ? "B"
      : gpa >= 2.0
      ? "C"
      : gpa >= 1.0
      ? "D"
      : "F";

  const allSubjects = optionalResult ? [...subjects, optionalResult] : subjects;

  return {
    gpa,
    letterGrade,
    isGoldenAPlus,
    isPassed: true,
    subjects: allSubjects,
    failedSubjects: [],
  };
}

export const SSC_SUBJECTS = {
  Science: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "Mathematics", isMandatory: true },
      { name: "Religion & Ethics", isMandatory: true },
      { name: "BGS", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "Physics", isMandatory: true },
      { name: "Chemistry", isMandatory: true },
      { name: "Biology / Higher Math", isMandatory: true },
    ],
    optional: ["Higher Mathematics", "Agriculture"],
  },
  Commerce: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "Mathematics", isMandatory: true },
      { name: "Religion & Ethics", isMandatory: true },
      { name: "BGS", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "Accounting", isMandatory: true },
      { name: "Business Entrepreneurship", isMandatory: true },
      { name: "Finance & Banking", isMandatory: true },
    ],
    optional: ["Economics", "Computer Science"],
  },
  Humanities: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "Mathematics", isMandatory: true },
      { name: "Religion & Ethics", isMandatory: true },
      { name: "BGS", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "History", isMandatory: true },
      { name: "Geography", isMandatory: true },
      { name: "Civics / Economics", isMandatory: true },
    ],
    optional: ["Economics", "History", "Geography"],
  },
};

export const HSC_SUBJECTS = {
  Science: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "Physics", isMandatory: true },
      { name: "Chemistry", isMandatory: true },
      { name: "Biology / Higher Math", isMandatory: true },
    ],
    optional: ["Higher Math", "Biology"],
  },
  Commerce: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "Accounting", isMandatory: true },
      { name: "Business Organization", isMandatory: true },
      { name: "Finance & Banking", isMandatory: true },
    ],
    optional: ["Economics"],
  },
  Humanities: {
    main: [
      { name: "Bangla 1st", isMandatory: true },
      { name: "Bangla 2nd", isMandatory: true },
      { name: "English 1st", isMandatory: true },
      { name: "English 2nd", isMandatory: true },
      { name: "ICT", isMandatory: true },
      { name: "History", isMandatory: true },
      { name: "Islamic Studies / Logic", isMandatory: true },
      { name: "Economics", isMandatory: true },
    ],
    optional: ["Geography", "Social Work"],
  },
};

export const BD_BOARDS = [
  "Dhaka",
  "Chittagong",
  "Rajshahi",
  "Sylhet",
  "Barisal",
  "Dinajpur",
  "Jessore",
  "Comilla",
  "Madrasah",
  "Technical",
];
