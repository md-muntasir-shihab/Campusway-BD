import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';


// Mock auth BEFORE importing routes
jest.mock('../../src/middlewares/auth', () => ({
    authenticate: (req: Request, res: Response, next: NextFunction) => {
        (req as any).user = { _id: new mongoose.Types.ObjectId(), role: 'superadmin' };
        next();
    },
    authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
        next();
    }
}));

import adminProviderRoutes from '../../src/routes/adminProviderRoutes';
import NotificationProvider from '../../src/models/NotificationProvider';

const app = express();
app.use(express.json());
app.use('/api/admin/providers', adminProviderRoutes);

beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect('mongodb://127.0.0.1:27017/campusway_test_api');
    }
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-00000000000000';
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0 && mongoose.connection.name === 'campusway_test_api') {
        await mongoose.disconnect();
    }
});

beforeEach(async () => {
    await NotificationProvider.deleteMany({});
});

describe('Admin Provider Routes', () => {
    it('creates a provider encrypting credentials, and hides credentials on retrieval', async () => {
        const payload = {
            type: 'sms',
            provider: 'twilio',
            displayName: 'Test Twilio Provider',
            credentials: {
                apiKey: 'secret_key_123',
                apiEndpoint: 'https://api.twilio.com'
            },
            senderConfig: {
                smsSenderId: 'CAMPUSWAY'
            }
        };

        // 1. Create Provider
        const res = await request(app).post('/api/admin/providers').send(payload);
        
        expect(res.status).toBe(201);
        expect(res.body.displayName).toBe('Test Twilio Provider');
        expect(res.body.type).toBe('sms');
        expect(res.body.credentials).toBeUndefined(); // Ensure not returned
        expect(res.body.credentialsEncrypted).toBeUndefined(); // Ensure encrypted string not returned to frontend
        
        const providerId = res.body._id;

        // 2. Verify Database Object has correct encryption string format (IV:AuthTag:Encrypted)
        const dbDoc = await NotificationProvider.findById(providerId).select('+credentialsEncrypted');
        expect(dbDoc).toBeDefined();
        expect(dbDoc!.credentialsEncrypted).toBeDefined();
        const parts = dbDoc!.credentialsEncrypted.split(':');
        expect(parts.length).toBe(3); // iv, auth tag, payload

        // 3. Verify LIST hides credentials
        const listRes = await request(app).get('/api/admin/providers');
        expect(listRes.status).toBe(200);
        expect(listRes.body.providers.length).toBe(1);
        expect(listRes.body.providers[0].credentialsEncrypted).toBeUndefined();
        expect(listRes.body.providers[0].displayName).toBe('Test Twilio Provider');

        // 4. Verify UPDATE works
        const updateRes = await request(app).put(`/api/admin/providers/${providerId}`).send({
            displayName: 'Updated Twilio'
        });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.displayName).toBe('Updated Twilio');
        
        // 5. Verify DELETE works
        const delRes = await request(app).delete(`/api/admin/providers/${providerId}`);
        expect(delRes.status).toBe(200);
    });

    it('toggles provider active state successfully', async () => {
        const doc = await NotificationProvider.create({
            type: 'email',
            provider: 'smtp',
            displayName: 'SMTP Test',
            credentialsEncrypted: 'mock-encrypted-str',
            isEnabled: true
        });

        const res = await request(app).patch(`/api/admin/providers/${doc._id}/toggle`);
        expect(res.status).toBe(200);
        expect(res.body.isEnabled).toBe(false);

        const updatedDoc = await NotificationProvider.findById(doc._id);
        expect(updatedDoc!.isEnabled).toBe(false);
    });
});
