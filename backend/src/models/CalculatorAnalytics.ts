import mongoose, { Schema, Document } from 'mongoose';

export type CalculatorType = 'ssc' | 'hsc' | 'olevel' | 'cgpa' | 'nu';

export interface ICalculatorAnalytics extends Document {
    calculatorType: CalculatorType;
    date: string; // YYYY-MM-DD format for easy daily aggregation
    usageCount: number;
    updatedAt: Date;
    createdAt: Date;
}

const CalculatorAnalyticsSchema = new Schema<ICalculatorAnalytics>({
    calculatorType: { 
        type: String, 
        required: true, 
        enum: ['ssc', 'hsc', 'olevel', 'cgpa', 'nu'] 
    },
    date: { 
        type: String, 
        required: true,
        index: true 
    },
    usageCount: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// Compound index to ensure one record per calculator per day
CalculatorAnalyticsSchema.index({ calculatorType: 1, date: 1 }, { unique: true });

export default mongoose.model<ICalculatorAnalytics>('CalculatorAnalytics', CalculatorAnalyticsSchema);
