import api from './api';

export interface CalculatorSettings {
    isSSCEnabled: boolean;
    isHSCEnabled: boolean;
    isOLevelEnabled: boolean;
    isCGPAEnabled: boolean;
    isNUEnabled: boolean;
    maintenanceMode: boolean;
}

export interface CalculatorAnalyticsItem {
    calculatorType: string;
    date: string;
    usageCount: number;
}

/** A grade-table row, shaped to match the DB-driven CalculatorGrading model. */
export interface GradeRow {
    minMark: number;
    maxMark: number;
    grade: string;
    point: number;
}

/** The four admin-editable grading tables. */
export interface GradingConfig {
    bdBoardTable: GradeRow[];
    publicUniTable: GradeRow[];
    privateUniTable: GradeRow[];
    oaTable: GradeRow[];
}

export const CalculatorService = {
    getSettings: async (): Promise<CalculatorSettings> => {
        // Shared axios interceptor already unwraps the {success, data} envelope,
        // so the payload lives at response.data (not response.data.data).
        const response = await api.get('/v1/calculators/settings');
        return response.data as CalculatorSettings;
    },

    updateSettings: async (settings: Partial<CalculatorSettings>): Promise<CalculatorSettings> => {
        const response = await api.put('/v1/calculators/settings', settings);
        return response.data as CalculatorSettings;
    },

    /** Fetch the four admin-managed grading tables. Failing is non-fatal — callers fall back to hardcoded defaults. */
    getGrading: async (): Promise<GradingConfig> => {
        const response = await api.get('/v1/calculators/grading');
        return response.data as GradingConfig;
    },

    updateGrading: async (grading: Partial<GradingConfig>): Promise<GradingConfig> => {
        const response = await api.put('/v1/calculators/grading', grading);
        return response.data as GradingConfig;
    },

    trackUsage: async (type: string): Promise<void> => {
        await api.post('/v1/calculators/track', { type });
    },

    getAnalytics: async (days: number = 7): Promise<CalculatorAnalyticsItem[]> => {
        const response = await api.get(`/v1/calculators/analytics?days=${days}`);
        const data = response.data as CalculatorAnalyticsItem[] | { items?: CalculatorAnalyticsItem[] };
        // Interceptor may wrap arrays into { items } for paginated responses; handle both.
        return Array.isArray(data) ? data : (data?.items ?? []);
    }
};
