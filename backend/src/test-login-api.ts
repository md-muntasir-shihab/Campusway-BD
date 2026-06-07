import { logger } from './utils/logger';
import { Request } from 'express';

async function testLogin() {
    try {
        logger.info(`Testing login for ${process.env.TEST_LOGIN_EMAIL || 'student@campusway.com'}...`);
        const response = await fetch(`http://localhost:${process.env.PORT || 5002}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: process.env.TEST_LOGIN_EMAIL || 'student@campusway.com',
                password: process.env.TEST_LOGIN_PASSWORD || ''
            })
        });

        const data = await response.json() as any;

        if (response.ok) {
            logger.info('Status:', undefined, { status: response.status });
            logger.info('User Role:', undefined, { role: data.user?.role });
        } else {
            logger.warn('Login Failed!');
            logger.warn('Status:', undefined, { status: response.status });
        }
    } catch (error: any) {
        logger.error('Error:', undefined, { message: error.message });
    }
}

testLogin();
