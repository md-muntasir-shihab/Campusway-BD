import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentDueLedger extends Document {
    studentId: mongoose.Types.ObjectId;
    computedDue: number;
    manualAdjustment: number;
    waiverAmount: number;
    netDue: number;
    lastComputedAt: Date;
    updatedBy: mongoose.Types.ObjectId;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentDueLedgerSchema = new Schema<IStudentDueLedger>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        computedDue: { type: Number, default: 0 },
        manualAdjustment: { type: Number, default: 0 },
        waiverAmount: { type: Number, default: 0 },
        netDue: { type: Number, default: 0 },
        lastComputedAt: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, trim: true, default: '' },
    },
    { timestamps: true, collection: 'student_due_ledgers' }
);

StudentDueLedgerSchema.index({ netDue: -1, updatedAt: -1 });

export default mongoose.model<IStudentDueLedger>('StudentDueLedger', StudentDueLedgerSchema);
