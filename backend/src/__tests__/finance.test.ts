import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { fcGetDashboard } from '../controllers/financeCenterController';
import * as financeService from '../services/financeCenterService';
import { vi, describe, it, beforeAll, afterEach, expect } from 'vitest';

vi.mock('../services/financeCenterService');

describe('Finance Center Controller', () => {
    let app: express.Express;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        
        // Mock authorization middleware for the test
        const mockAuth = (req: Request, res: Response, next: NextFunction) => {
            req.user = { id: 'admin123', role: 'admin' } as any;
            next();
        };

        app.get('/api/admin/fc/dashboard', mockAuth, fcGetDashboard);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return finance dashboard summary', async () => {
        const mockSummary = {
            month: '2023-10',
            incomeTotal: 5000,
            expenseTotal: 1000,
            netProfit: 4000,
            subscriptionRevenue: 2000,
            examRevenue: 3000,
            manualRevenue: 0,
            manualServiceRevenue: 0,
            refundTotal: 0,
            prevMonthIncome: 4000,
            prevMonthExpense: 800,
            monthOverMonthChange: { incomeChange: 25, expenseChange: 25 },
            receivablesTotal: 0,
            receivablesCount: 0,
            payablesTotal: 0,
            payablesCount: 0,
            activeBudgetUsagePercent: 0,
            topIncomeSources: [],
            topExpenseCategories: [],
            incomeBySource: [],
            expenseByCategory: [],
            dailyCashflowTrend: [],
            budgetStatus: [],
            recentActivity: [],
        };

        (financeService.getFinanceSummary as any).mockResolvedValue(mockSummary);

        const res = await request(app).get('/api/admin/fc/dashboard');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.data.netProfit).toBe(4000);
    });
});

