import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentSettings extends Document {
    key: string;
    expiryReminderDays: number[];
    autoExpireEnabled: boolean;
    passwordResetOnExpiry: boolean;
    autoAlertTriggers: {
        onNewsPublished: boolean;
        onExamPublished: boolean;
        onResourcePublished: boolean;
    };
    smsEnabled: boolean;
    emailEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    defaultSmsFromName?: string;
    defaultEmailFromName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSettingsSchema = new Schema<IStudentSettings>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            default: 'default',
        },
        expiryReminderDays: {
            type: [Number],
            default: [7, 3, 1],
        },
        autoExpireEnabled: { type: Boolean, default: true },
        passwordResetOnExpiry: { type: Boolean, default: true },
        autoAlertTriggers: {
            type: new Schema(
                {
                    onNewsPublished: { type: Boolean, default: true },
                    onExamPublished: { type: Boolean, default: true },
                    onResourcePublished: { type: Boolean, default: false },
                },
                { _id: false }
            ),
            default: () => ({
                onNewsPublished: true,
                onExamPublished: true,
                onResourcePublished: false,
            }),
        },
        smsEnabled: { type: Boolean, default: true },
        emailEnabled: { type: Boolean, default: true },
        quietHoursStart: { type: String, trim: true },
        quietHoursEnd: { type: String, trim: true },
        defaultSmsFromName: { type: String, trim: true },
        defaultEmailFromName: { type: String, trim: true },
    },
    { timestamps: true, collection: 'student_settings' }
);

/**
 * Singleton accessor — returns the single 'default' settings doc, creating it if absent.
 */
StudentSettingsSchema.statics.getDefault = async function (): Promise<IStudentSettings> {
    const existing = await this.findOne({ key: 'default' });
    if (existing) return existing;
    return this.create({ key: 'default' });
};

export const StudentSettingsModel = mongoose.model<IStudentSettings>('StudentSettings', StudentSettingsSchema);
export default StudentSettingsModel;
