import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A single grade row: maps a marks range to a letter grade and GPA point.
 * Used by all four grading tables (BD board, public university, private
 * university, O/A level).
 */
export interface IGradeRow {
    minMark: number;
    maxMark: number;
    grade: string;
    point: number;
}

/**
 * Plain (non-document) shape of the four grade tables. Used both as the
 * default seed value and as the clean type returned to API consumers, so we
 * don't leak Mongoose document internals into shared code.
 */
export interface IGradingData {
    /** SSC / HSC / JSC / Dakhil / Alim — Bangladesh Board (scale 0–5.00) */
    bdBoardTable: IGradeRow[];
    /** Public university CGPA — Variant A (scale 0–4.00) */
    publicUniTable: IGradeRow[];
    /** Private university CGPA — Variant B (scale 0–4.00) */
    privateUniTable: IGradeRow[];
    /** O-Level / A-Level Bangladesh conversion (scale 0–5.00) */
    oaTable: IGradeRow[];
}

export interface ICalculatorGrading extends IGradingData, Document {
    updatedAt: Date;
    createdAt: Date;
}

const GradeRowSchema = new Schema<IGradeRow>(
    {
        minMark: { type: Number, required: true, min: 0, max: 100 },
        maxMark: { type: Number, required: true, min: 0, max: 100 },
        grade: { type: String, required: true, trim: true },
        point: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

/**
 * Default values mirror the previously hardcoded constants in the frontend
 * lib files (ssc-hsc.ts, cgpa.ts, olevel.ts). Seeding with these guarantees
 * zero behavior change when migrating to DB-driven grading.
 */
export const DEFAULT_GRADING: IGradingData = {
    bdBoardTable: [
        { minMark: 80, maxMark: 100, grade: 'A+', point: 5.0 },
        { minMark: 70, maxMark: 79, grade: 'A', point: 4.0 },
        { minMark: 60, maxMark: 69, grade: 'A-', point: 3.5 },
        { minMark: 50, maxMark: 59, grade: 'B', point: 3.0 },
        { minMark: 40, maxMark: 49, grade: 'C', point: 2.0 },
        { minMark: 33, maxMark: 39, grade: 'D', point: 1.0 },
        { minMark: 0, maxMark: 32, grade: 'F', point: 0.0 },
    ],
    publicUniTable: [
        { minMark: 80, maxMark: 100, grade: 'A+', point: 4.0 },
        { minMark: 75, maxMark: 79, grade: 'A', point: 3.75 },
        { minMark: 70, maxMark: 74, grade: 'A-', point: 3.5 },
        { minMark: 65, maxMark: 69, grade: 'B+', point: 3.25 },
        { minMark: 60, maxMark: 64, grade: 'B', point: 3.0 },
        { minMark: 55, maxMark: 59, grade: 'B-', point: 2.75 },
        { minMark: 50, maxMark: 54, grade: 'C+', point: 2.5 },
        { minMark: 45, maxMark: 49, grade: 'C', point: 2.25 },
        { minMark: 40, maxMark: 44, grade: 'D', point: 2.0 },
        { minMark: 0, maxMark: 39, grade: 'F', point: 0.0 },
    ],
    privateUniTable: [
        { minMark: 97, maxMark: 100, grade: 'A+', point: 4.0 },
        { minMark: 90, maxMark: 96, grade: 'A', point: 4.0 },
        { minMark: 85, maxMark: 89, grade: 'A-', point: 3.7 },
        { minMark: 80, maxMark: 84, grade: 'B+', point: 3.3 },
        { minMark: 75, maxMark: 79, grade: 'B', point: 3.0 },
        { minMark: 70, maxMark: 74, grade: 'B-', point: 2.7 },
        { minMark: 65, maxMark: 69, grade: 'C+', point: 2.3 },
        { minMark: 60, maxMark: 64, grade: 'C', point: 2.0 },
        { minMark: 50, maxMark: 59, grade: 'D', point: 1.0 },
        { minMark: 0, maxMark: 49, grade: 'F', point: 0.0 },
    ],
    oaTable: [
        { minMark: 0, maxMark: 0, grade: 'A*', point: 5.0 },
        { minMark: 0, maxMark: 0, grade: 'A', point: 5.0 },
        { minMark: 0, maxMark: 0, grade: 'B', point: 4.0 },
        { minMark: 0, maxMark: 0, grade: 'C', point: 3.0 },
        { minMark: 0, maxMark: 0, grade: 'D', point: 2.0 },
        { minMark: 0, maxMark: 0, grade: 'E', point: 1.0 },
    ],
};

const CalculatorGradingSchema = new Schema<ICalculatorGrading>(
    {
        bdBoardTable: { type: [GradeRowSchema], default: DEFAULT_GRADING.bdBoardTable },
        publicUniTable: { type: [GradeRowSchema], default: DEFAULT_GRADING.publicUniTable },
        privateUniTable: { type: [GradeRowSchema], default: DEFAULT_GRADING.privateUniTable },
        oaTable: { type: [GradeRowSchema], default: DEFAULT_GRADING.oaTable },
    },
    { timestamps: true }
);

// Singleton: only one grading document should ever exist.
CalculatorGradingSchema.statics.getSingleton = async function (this: Model<ICalculatorGrading>) {
    let doc = await this.findOne();
    if (!doc) {
        doc = await this.create({});
    }
    return doc;
};

// Attach the static helper to the model type.
interface ICalculatorGradingModel extends Model<ICalculatorGrading> {
    getSingleton(): Promise<ICalculatorGrading>;
}

const CalculatorGrading = mongoose.model<ICalculatorGrading, ICalculatorGradingModel>(
    'CalculatorGrading',
    CalculatorGradingSchema
);

export default CalculatorGrading;
