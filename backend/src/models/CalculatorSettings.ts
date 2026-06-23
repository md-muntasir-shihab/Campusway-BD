import mongoose, { Schema, Document } from 'mongoose';

export interface ICalculatorSettings extends Document {
    isSSCEnabled: boolean;
    isHSCEnabled: boolean;
    isOLevelEnabled: boolean;
    isCGPAEnabled: boolean;
    isNUEnabled: boolean;
    maintenanceMode: boolean;
    updatedAt: Date;
    createdAt: Date;
}

const CalculatorSettingsSchema = new Schema<ICalculatorSettings>({
    isSSCEnabled: { type: Boolean, default: true },
    isHSCEnabled: { type: Boolean, default: true },
    isOLevelEnabled: { type: Boolean, default: true },
    isCGPAEnabled: { type: Boolean, default: true },
    isNUEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ICalculatorSettings>('CalculatorSettings', CalculatorSettingsSchema);
