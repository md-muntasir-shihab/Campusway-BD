import { describe, it, expect, vi } from 'vitest';
import Testimonial from '../models/Testimonial';
import { submitPublicTestimonial } from '../controllers/testimonialPartnerController';
import { testimonialSubmitRateLimiter } from '../middleware/securityRateLimit';

describe('Public Testimonial Submission & Security Unit Tests', () => {
    describe('Testimonial Model Schema Constraints', () => {
        it('validates a valid testimonial instance correctly', () => {
            const testimonial = new Testimonial({
                name: 'Anisur Rahman',
                fullQuote: 'CampusWay helped me prepare for my university admission exam effectively.',
                rating: 5,
                status: 'pending',
                sourceType: 'user_submitted',
            });

            const err = testimonial.validateSync();
            expect(err).toBeUndefined();
            expect(testimonial.status).toBe('pending');
            expect(testimonial.sourceType).toBe('user_submitted');
            expect(testimonial.featured).toBe(false);
        });

        it('validates rating within 1-5 range', () => {
            const invalidTestimonial = new Testimonial({
                name: 'Test Student',
                fullQuote: 'Great platform',
                rating: 10, // Invalid rating (> 5)
            });

            const err = invalidTestimonial.validateSync();
            expect(err).toBeDefined();
            expect(err?.errors['rating']).toBeDefined();
        });

        it('fails validation when required fields name or fullQuote are missing', () => {
            const emptyTestimonial = new Testimonial({
                rating: 4,
            });

            const err = emptyTestimonial.validateSync();
            expect(err).toBeDefined();
            expect(err?.errors['name']).toBeDefined();
            expect(err?.errors['fullQuote']).toBeDefined();
        });
    });

    describe('submitPublicTestimonial Controller Unit Tests', () => {
        it('forces status to pending and sourceType to user_submitted even if user passes status approved', async () => {
            // Mock req, res
            const req = {
                body: {
                    name: 'Sabbir Hossain',
                    role: 'Student',
                    university: 'Dhaka University',
                    fullQuote: 'Awesome mock test experience!',
                    rating: 5,
                    status: 'approved', // Attacker trying to self-approve
                    featured: true, // Attacker trying to self-feature
                },
            } as any;

            let jsonResponse: any = null;
            let statusCode: number = 0;

            const res = {
                status: (code: number) => {
                    statusCode = code;
                    return res;
                },
                json: (data: any) => {
                    jsonResponse = data;
                    return res;
                },
            } as any;

            // Mock Testimonial.create
            const createSpy = vi.spyOn(Testimonial, 'create').mockImplementation(async (payload: any) => {
                return {
                    _id: 'mock_id_123',
                    ...payload,
                } as any;
            });

            await submitPublicTestimonial(req, res);

            expect(statusCode).toBe(201);
            expect(createSpy).toHaveBeenCalled();
            
            const createdPayload = createSpy.mock.calls[0][0];
            expect(createdPayload.status).toBe('pending');
            expect(createdPayload.sourceType).toBe('user_submitted');
            expect(createdPayload.featured).toBe(false);
            expect(jsonResponse.success).toBe(true);

            createSpy.mockRestore();
        });

        it('returns 400 when required name or fullQuote is missing in request', async () => {
            const req = {
                body: {
                    name: '',
                    fullQuote: '',
                },
            } as any;

            let statusCode: number = 0;
            let jsonResponse: any = null;

            const res = {
                status: (code: number) => {
                    statusCode = code;
                    return res;
                },
                json: (data: any) => {
                    jsonResponse = data;
                    return res;
                },
            } as any;

            await submitPublicTestimonial(req, res);

            expect(statusCode).toBe(400);
            expect(jsonResponse.success).toBe(false);
        });
    });

    describe('Rate Limiter Configuration Check', () => {
        it('exports testimonialSubmitRateLimiter middleware correctly', () => {
            expect(testimonialSubmitRateLimiter).toBeDefined();
            expect(typeof testimonialSubmitRateLimiter).toBe('function');
        });
    });
});
