import { Request, Response } from 'express';
import FounderProfile from '../models/FounderProfile';
import { AuthRequest } from '../middlewares/auth';

/* ═══════════════════════════════════════════════════════════
   PUBLIC  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/founder — public, no auth */
export async function getPublicFounder(_req: Request, res: Response): Promise<void> {
    try {
        const founder = await FounderProfile.findOne().lean();

        if (!founder) {
            res.status(404).json({ error: 'Founder profile not found' });
            return;
        }

        res.json(founder);
    } catch (err) {
        console.error('getPublicFounder error:', err);
        res.status(500).json({ error: 'Server error' });
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
            res.status(404).json({ error: 'Founder profile not found' });
            return;
        }

        res.json(founder);
    } catch (err) {
        console.error('getAdminFounder error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/** PUT /api/admin/founder — create or update the singleton founder document */
export async function upsertFounder(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { name, tagline, founderMessage, photoUrl, role, aboutText, fatherName, dateOfBirth, gender, address, location, contactDetails, skills, education, experience } = req.body;

        if (!name || !String(name).trim()) {
            res.status(400).json({ error: 'Name is required', field: 'name' });
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

        res.json({ founder, message: 'Founder profile updated' });
    } catch (err) {
        console.error('upsertFounder error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
