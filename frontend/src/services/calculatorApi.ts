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

export const CalculatorService = {
    getSettings: async (): Promise<CalculatorSettings> => {
        const response = await api.get('/calculators/settings');
        return response.data.data;
    },

    updateSettings: async (settings: Partial<CalculatorSettings>): Promise<CalculatorSettings> => {
        const response = await api.put('/calculators/settings', settings);
        return response.data.data;
    },

    trackUsage: async (type: string): Promise<void> => {
        await api.post('/calculators/track', { type });
    },

    getAnalytics: async (days: number = 7): Promise<CalculatorAnalyticsItem[]> => {
        const response = await api.get(`/calculators/analytics?days=${days}`);
        return response.data.data;
    }
};
