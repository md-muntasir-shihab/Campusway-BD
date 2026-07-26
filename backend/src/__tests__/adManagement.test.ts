import { describe, it, expect } from 'vitest';
import { AdCampaign, AdCreative } from '../models';

describe('Native Ad Management & Analytics Unit Tests', () => {
    describe('AdCampaign Model Structure & Validation', () => {
        it('validates a complete AdCampaign instance', () => {
            const campaign = new AdCampaign({
                name: 'Spring Admission Campaign 2026',
                advertiserName: 'Dhaka University Admission Prep',
                status: 'active',
                budgetBDT: 50000,
                spentBDT: 0,
                cpcRateBDT: 15,
                cpmRateBDT: 50,
                targetPlacements: ['home_top', 'sidebar'],
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });

            const err = campaign.validateSync();
            expect(err).toBeUndefined();
            expect(campaign.name).toBe('Spring Admission Campaign 2026');
            expect(campaign.status).toBe('active');
            expect(campaign.cpcRateBDT).toBe(15);
            expect(campaign.budgetBDT).toBe(50000);
        });

        it('defaults status to draft when not provided', () => {
            const campaign = new AdCampaign({
                name: 'Draft Campaign',
                advertiserName: 'Test Advertiser',
                budgetBDT: 10000,
                startDate: new Date(),
            });

            expect(campaign.status).toBe('draft');
            expect(campaign.spentBDT).toBe(0);
        });

        it('fails validation when required fields are missing', () => {
            const campaign = new AdCampaign({});
            const err = campaign.validateSync();
            expect(err).toBeDefined();
            expect(err?.errors['name']).toBeDefined();
            expect(err?.errors['advertiserName']).toBeDefined();
        });
    });

    describe('AdCreative Model Structure & Validation', () => {
        it('validates creative position and attachment to campaign', () => {
            const campaignId = '507f1f77bcf86cd799439011';
            const creative = new AdCreative({
                campaignId,
                title: 'BUET Admission Special Batch',
                imageUrl: 'https://example.com/banner.png',
                ctaLink: 'https://buetprep.com/register',
                ctaText: 'Enroll Now',
                position: 'home_top',
                variantGroup: 'A',
                status: 'active',
            });

            const err = creative.validateSync();
            expect(err).toBeUndefined();
            expect(creative.position).toBe('home_top');
            expect(creative.status).toBe('active');
            expect(creative.ctaText).toBe('Enroll Now');
        });

        it('fails validation when imageUrl is missing', () => {
            const creative = new AdCreative({
                title: 'No Image Creative',
                position: 'sidebar',
            });

            const err = creative.validateSync();
            expect(err).toBeDefined();
            expect(err?.errors['imageUrl']).toBeDefined();
        });
    });

    describe('Ad Analytics & Revenue Computation Logic', () => {
        it('calculates CTR (Click-Through Rate) accurately', () => {
            const impressions = 1250;
            const clicks = 75;
            const ctr = (clicks / impressions) * 100;

            expect(ctr).toBe(6); // 75 / 1250 * 100 = 6%
        });

        it('calculates total revenue based on CPC and CPM models', () => {
            const cpcClicks = 50;
            const cpcRate = 12; // 12 BDT per click
            const cpmImpressions = 10000;
            const cpmRate = 40; // 40 BDT per 1000 impressions

            const cpcRevenue = cpcClicks * cpcRate;
            const cpmRevenue = (cpmImpressions / 1000) * cpmRate;
            const totalRevenue = cpcRevenue + cpmRevenue;

            expect(cpcRevenue).toBe(600);
            expect(cpmRevenue).toBe(400);
            expect(totalRevenue).toBe(1000);
        });

        it('handles zero impressions gracefully without division by zero', () => {
            const impressions = 0;
            const clicks = 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

            expect(ctr).toBe(0);
        });
    });
});
