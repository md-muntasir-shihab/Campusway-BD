import { Request, Response } from 'express';
import FounderProfile from '../models/FounderProfile';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';

/* ═══════════════════════════════════════════════════════════
   PUBLIC  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/founder — public, no auth */
export async function getPublicFounder(_req: Request, res: Response): Promise<void> {
    try {
        const founder = await FounderProfile.findOne().lean();

        if (!founder) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Founder profile not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success(founder));
    } catch (err) {
        console.error('getPublicFounder error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/admin/founder — full document for editing */
export async function getAdminFounder(_req: Request, res: Response): Promise<void> {
    try {
        const founder = await FounderProfile.findOne().lean();

        if (!founder) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Founder profile not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success(founder));
    } catch (err) {
        console.error('getAdminFounder error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/** PUT /api/admin/founder — create or update the singleton founder document */
export async function upsertFounder(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { name, tagline, founderMessage, photoUrl, role, aboutText, fatherName, dateOfBirth, gender, address, location, contactDetails, skills, education, experience } = req.body;

        if (!name || !String(name).trim()) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Name is required', { field: 'name' }));
            return;
        }

        const updateData = {
            name: String(name).trim(),
            tagline: tagline || '',
            founderMessage: founderMessage || '',
            photoUrl: photoUrl || '',
            role: role || '',
            aboutText: aboutText || '',
            fatherName: fatherName || '',
            dateOfBirth: dateOfBirth || '',
            gender: gender || '',
            address: address || '',
            location: location || '',
            contactDetails: contactDetails || { phones: [], email: '', website: '' },
            skills: skills || [],
            education: education || [],
            experience: experience || [],
        };

        const founder = await FounderProfile.findOneAndUpdate(
            {},
            { $set: updateData },
            { upsert: true, new: true, runValidators: true },
        ).lean();

        ResponseBuilder.send(res, 200, ResponseBuilder.success({founder}, 'Founder profile updated'));
    } catch (err) {
        console.error('upsertFounder error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
