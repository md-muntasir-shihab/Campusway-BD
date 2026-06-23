import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// Controllers
import {
    submitPublicContactMessage,
    adminGetContactMessages,
    adminGetContactMessageById,
    adminUpdateContactMessage,
    adminMarkContactMessageRead,
    adminResolveContactMessage,
} from '../../controllers/contactController';

// Services to mock
import * as contactMessageService from '../../services/contactMessageService';

vi.mock('../../services/contactMessageService');

/**
 * Integration Tests: Contact Message Flow (Mocked Services)
 * Validates public submission and admin management routing & controllers.
 */

let app: express.Express;

beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock IP/Device extraction
    app.use((req: any, res: Response, next: NextFunction) => {
        req.headers['x-forwarded-for'] = '127.0.0.1';
        req.headers['user-agent'] = 'TestAgent/1.0';
        next();
    });

    const mockAdminAuth = (req: any, res: Response, next: NextFunction) => {
        req.user = { _id: 'admin123', role: 'superadmin' };
        next();
    };

    // Public Routes
    app.post('/api/contact', submitPublicContactMessage);

    // Admin Routes
    app.get('/api/admin/contact', mockAdminAuth, adminGetContactMessages);
    app.get('/api/admin/contact/:id', mockAdminAuth, adminGetContactMessageById);
    app.patch('/api/admin/contact/:id', mockAdminAuth, adminUpdateContactMessage);
    app.patch('/api/admin/contact/:id/read', mockAdminAuth, adminMarkContactMessageRead);
    app.patch('/api/admin/contact/:id/resolve', mockAdminAuth, adminResolveContactMessage);

    // Global error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error('Express Error:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Contact Message Flow (Mocked)', () => {
    it('1. should allow public to submit a contact message', async () => {
        (contactMessageService.createContactMessage as any).mockResolvedValue({
            _id: 'mockId123',
            name: 'John Doe',
            email: 'johndoe@example.com',
            isRead: false
        });

        const payload = {
            name: 'John Doe',
            email: 'johndoe@example.com',
            subject: 'Login Issue',
            message: 'I cannot login to my account. Please help.',
            topic: 'support'
        };

        const res = await request(app)
            .post('/api/contact')
            .send(payload);

        if (res.status !== 201) {
            console.error('Test 1 failed. Body:', res.body);
        }

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe('mockId123');
        expect(contactMessageService.createContactMessage).toHaveBeenCalledTimes(1);
    });

    it('2. should reject submission with missing fields or invalid email', async () => {
        // Missing fields
        const res1 = await request(app).post('/api/contact').send({ name: 'John Doe' });
        expect(res1.status).toBe(400);

        // Invalid email
        const res2 = await request(app).post('/api/contact').send({
            name: 'John', email: 'invalid-email', subject: 'A', message: 'B'
        });
        expect(res2.status).toBe(400);

        expect(contactMessageService.createContactMessage).not.toHaveBeenCalled();
    });

    it('3. should list contact messages for admin with proper filters', async () => {
        (contactMessageService.listContactMessages as any).mockResolvedValue({
            items: [
                { _id: 'msg1', name: 'Alice', email: 'alice@a.com', subject: 'Sub1', status: 'pending' },
            ],
            total: 1,
            page: 1,
            totalPages: 1
        });

        const res = await request(app).get('/api/admin/contact?filter=pending');
        if (res.status !== 200) {
            console.error('Test 3 failed. Body:', res.body);
        }
        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].name).toBe('Alice');
        expect(contactMessageService.listContactMessages).toHaveBeenCalledWith(expect.objectContaining({
            filter: 'pending'
        }));
    });

    it('4. should mark message as read', async () => {
        (contactMessageService.markContactMessageRead as any).mockResolvedValue({
            _id: 'msg1',
            isRead: true
        });

        const res = await request(app).patch('/api/admin/contact/msg1/read');
        expect(res.status).toBe(200);
        expect(res.body.data.item.isRead).toBe(true);
        expect(contactMessageService.markContactMessageRead).toHaveBeenCalledWith('msg1');
    });

    it('5. should resolve a contact message', async () => {
        (contactMessageService.resolveContactMessage as any).mockResolvedValue({
            _id: 'msg1',
            status: 'resolved'
        });

        const res = await request(app).patch('/api/admin/contact/msg1/resolve');
        expect(res.status).toBe(200);
        expect(res.body.data.item.status).toBe('resolved');
        expect(contactMessageService.resolveContactMessage).toHaveBeenCalledWith('msg1');
    });
});
