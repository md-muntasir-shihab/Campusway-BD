import mongoose, { Document, Schema } from 'mongoose';

export interface ISolutionContent {
    text?: string;
    imageUrl?: string;
    mathHtml?: string;
    pdfUrl?: string;
}

export interface ILocalizedText {
    en?: string;
    bn?: string;
}

export interface IQuestionOption {
    key: string;
    text: string;
    media_id?: mongoose.Types.ObjectId | null;
}

export interface ILocalizedQuestionOption {
    key: string;
    text: ILocalizedText;
    media_id?: mongoose.Types.ObjectId | null;
}

export interface IQuestion extends Document {
    exam?: mongoose.Types.ObjectId;
    university_id?: mongoose.Types.ObjectId;
    exam_pool_id?: string;

    // Legacy hierarchy fields
    class?: string;
    category?: 'Science' | 'Arts' | 'Commerce' | 'Mixed';
    subject?: string;
    chapter?: string;

    // New taxonomy
    class_level?: string;
    department?: string;
    topic?: string;
    skill_tags?: string[];
    estimated_time?: number;

    // Hierarchical taxonomy refs (QuestionGroup → QuestionCategory → QuestionTopic)
    group_id?: mongoose.Types.ObjectId | null;
    category_id?: mongoose.Types.ObjectId | null;
    topic_id?: mongoose.Types.ObjectId | null;

    // Core question content (legacy + normalized)
    question: string;
    question_text?: string;
    questionText?: ILocalizedText;
    question_html?: string;
    questionImage?: string;
    questionType: 'mcq' | 'written';
    question_type?: 'MCQ' | 'MULTI' | 'WRITTEN' | 'TF';
    options?: IQuestionOption[];
    optionsLocalized?: ILocalizedQuestionOption[];
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer?: 'A' | 'B' | 'C' | 'D';
    correct_answer?: string[];
    languageMode?: 'EN' | 'BN' | 'BOTH';

    max_attempt_select: number;
    tags: string[];
    assets: string[];

    explanation?: string;
    explanationText?: ILocalizedText;
    solutionImage?: string;
    solution?: ISolutionContent;
    explanation_text?: string;
    explanation_image_url?: string;
    explanation_formula?: string;
    has_explanation?: boolean;

    marks: number;
    negativeMarks?: number;
    negative_marks?: number;
    section?: string;

    difficulty: 'easy' | 'medium' | 'hard';
    order: number;
    active: boolean;

    // Moderation and lifecycle
    status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
    moderation_reason?: string;
    moderated_by?: mongoose.Types.ObjectId | null;
    moderated_at?: Date | null;
    locked?: boolean;
    locked_reason?: string;
    locked_by?: mongoose.Types.ObjectId | null;
    locked_at?: Date | null;
    archived_at?: Date | null;
    archived_by?: mongoose.Types.ObjectId | null;

    // Media references
    image_media_id?: mongoose.Types.ObjectId | null;
    media_status?: 'pending' | 'approved' | 'rejected';
    media_alt_text_bn?: string;

    // Quality and duplicate signals
    quality_score?: number;
    quality_flags?: string[];
    flagged_duplicate?: boolean;
    duplicate_of_ids?: mongoose.Types.ObjectId[];
    manual_flags?: string[];

    // Revision metadata
    revision_no?: number;
    previous_revision_id?: mongoose.Types.ObjectId | null;
    last_edited_by?: mongoose.Types.ObjectId | null;

    // Analytics
    usage_count?: number;
    avg_correct_pct?: number | null;
    last_used_in_exam?: mongoose.Types.ObjectId | null;
    last_used_at?: Date | null;
    totalAttempted: number;
    totalCorrect: number;

    created_by?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const SolutionSchema = new Schema(
    {
        text: String,
        imageUrl: String,
        mathHtml: String,
        pdfUrl: String,
    },
    { _id: false },
);

const QuestionOptionSchema = new Schema<IQuestionOption>(
    {
        key: { type: String, required: true, uppercase: true, trim: true },
        text: { type: String, required: true, trim: true },
        media_id: { type: Schema.Types.ObjectId, ref: 'QuestionMedia', default: null },
    },
    { _id: false },
);

const LocalizedTextSchema = new Schema<ILocalizedText>(
    {
        en: { type: String, default: '' },
        bn: { type: String, default: '' },
    },
    { _id: false },
);

const LocalizedQuestionOptionSchema = new Schema<ILocalizedQuestionOption>(
    {
        key: { type: String, required: true, uppercase: true, trim: true },
        text: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        media_id: { type: Schema.Types.ObjectId, ref: 'QuestionMedia', default: null },
    },
    { _id: false },
);

const QuestionSchema = new Schema<IQuestion>(
    {
        exam: { type: Schema.Types.ObjectId, ref: 'Exam' },
        university_id: { type: Schema.Types.ObjectId, ref: 'University' },
        exam_pool_id: String,

        class: String,
        category: { type: String, enum: ['Science', 'Arts', 'Commerce', 'Mixed'] },
        subject: String,
        chapter: String,

        class_level: { type: String, default: '' },
        department: { type: String, default: '' },
        topic: { type: String, default: '' },
        skill_tags: { type: [String], default: [] },
        estimated_time: { type: Number, default: 60 },

        // Hierarchical taxonomy refs
        group_id: { type: Schema.Types.ObjectId, ref: 'QuestionGroup', default: null, index: true },
        category_id: { type: Schema.Types.ObjectId, ref: 'QuestionCategory', default: null, index: true },
        topic_id: { type: Schema.Types.ObjectId, ref: 'QuestionTopic', default: null, index: true },

        question: { type: String, required: true, trim: true },
        question_text: { type: String, default: '' },
        questionText: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        question_html: { type: String, default: '' },
        questionImage: String,
        questionType: { type: String, enum: ['mcq', 'written'], default: 'mcq' },
        question_type: { type: String, enum: ['MCQ', 'MULTI', 'WRITTEN', 'TF'], default: 'MCQ' },
        options: { type: [QuestionOptionSchema], default: [] },
        optionsLocalized: { type: [LocalizedQuestionOptionSchema], default: [] },
        optionA: { type: String, required: false, default: '' },
        optionB: { type: String, required: false, default: '' },
        optionC: { type: String, required: false, default: '' },
        optionD: { type: String, required: false, default: '' },
        correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: false },
        correct_answer: { type: [String], default: [] },
        languageMode: { type: String, enum: ['EN', 'BN', 'BOTH'], default: 'EN' },

        max_attempt_select: { type: Number, default: 1 },
        tags: { type: [String], default: [] },
        assets: { type: [String], default: [] },

        explanation: String,
        explanationText: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        solutionImage: String,
        solution: { type: SolutionSchema, default: undefined },
        explanation_text: String,
        explanation_image_url: String,
        explanation_formula: String,
        has_explanation: { type: Boolean, default: false },

        marks: { type: Number, default: 1 },
        negativeMarks: { type: Number, default: undefined },
        negative_marks: { type: Number, default: 0 },
        section: { type: String, default: undefined },

        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },

        status: {
            type: String,
            enum: ['draft', 'pending_review', 'approved', 'rejected', 'archived'],
            default: 'draft',
        },
        moderation_reason: { type: String, default: '' },
        moderated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        moderated_at: { type: Date, default: null },
        locked: { type: Boolean, default: false },
        locked_reason: { type: String, default: '' },
        locked_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        locked_at: { type: Date, default: null },
        archived_at: { type: Date, default: null },
        archived_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },

        image_media_id: { type: Schema.Types.ObjectId, ref: 'QuestionMedia', default: null },
        media_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
        media_alt_text_bn: { type: String, default: '' },

        quality_score: { type: Number, default: 0 },
        quality_flags: { type: [String], default: [] },
        flagged_duplicate: { type: Boolean, default: false },
        duplicate_of_ids: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
        manual_flags: { type: [String], default: [] },

        revision_no: { type: Number, default: 1 },
        previous_revision_id: { type: Schema.Types.ObjectId, ref: 'QuestionRevision', default: null },
        last_edited_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },

        usage_count: { type: Number, default: 0 },
        avg_correct_pct: { type: Number, default: null },
        last_used_in_exam: { type: Schema.Types.ObjectId, ref: 'Exam', default: null },
        last_used_at: { type: Date, default: null },
        totalAttempted: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },

        created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'question_bank' },
);

QuestionSchema.index({ exam: 1, order: 1 });
QuestionSchema.index({ class: 1, subject: 1, chapter: 1 });
QuestionSchema.index({ class_level: 1, department: 1, subject: 1, chapter: 1, difficulty: 1 });
QuestionSchema.index({ status: 1, updatedAt: -1 });
QuestionSchema.index({ quality_score: -1, usage_count: -1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ group_id: 1, category_id: 1, topic_id: 1, difficulty: 1, status: 1 });
QuestionSchema.index({ topic_id: 1, status: 1, active: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
