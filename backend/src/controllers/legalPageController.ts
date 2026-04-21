import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LegalPage from '../models/LegalPage';
import { AuthRequest } from '../middlewares/auth';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ═══════════════════════════════════════════════════════════
   PUBLIC  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/legal-pages/:slug — public, no auth */
export async function getPublicLegalPage(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const page = await LegalPage.findOne({ slug })
            .select('slug title htmlContent metaTitle metaDescription updatedAt')
            .lean();

        if (!page) {
            res.status(404).json({ error: 'Legal page not found' });
            return;
        }

        res.json(page);
    } catch (err) {
        console.error('getPublicLegalPage error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/admin/legal-pages — list all (title, slug, updatedAt) */
export async function listLegalPages(_req: Request, res: Response): Promise<void> {
    try {
        const pages = await LegalPage.find()
            .select('title slug updatedAt')
            .sort({ updatedAt: -1 })
            .lean();

        res.json({ pages });
    } catch (err) {
        console.error('listLegalPages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/** GET /api/admin/legal-pages/:slug — full document for editing */
export async function getAdminLegalPage(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const page = await LegalPage.findOne({ slug }).lean();

        if (!page) {
            res.status(404).json({ error: 'Legal page not found' });
            return;
        }

        res.json(page);
    } catch (err) {
        console.error('getAdminLegalPage error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/** POST /api/admin/legal-pages — create a new legal page */
export async function createLegalPage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { slug, title, htmlContent, metaTitle, metaDescription } = req.body;

        if (!title || !String(title).trim()) {
            res.status(400).json({ error: 'Title is required', field: 'title' });
            return;
        }

        if (!slug || !SLUG_REGEX.test(slug)) {
            res.status(400).json({ error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' });
            return;
        }

        const existing = await LegalPage.findOne({ slug }).lean();
        if (existing) {
            res.status(409).json({ error: 'A legal page with this slug already exists' });
            return;
        }

        const page = await LegalPage.create({
            slug,
            title: String(title).trim(),
            htmlContent: htmlContent || '',
            metaTitle: metaTitle || '',
            metaDescription: metaDescription || '',
            lastUpdatedBy: req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : undefined,
        });

        res.status(201).json({ page, message: 'Legal page created' });
    } catch (err) {
        console.error('createLegalPage error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/** PUT /api/admin/legal-pages/:slug — update an existing legal page */
export async function updateLegalPage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const page = await LegalPage.findOne({ slug });

        if (!page) {
            res.status(404).json({ error: 'Legal page not found' });
            return;
        }

        const { title, htmlContent, metaTitle, metaDescription } = req.body;

        if (title !== undefined) page.title = String(title).trim();
        if (htmlContent !== undefined) page.htmlContent = htmlContent;
        if (metaTitle !== undefined) page.metaTitle = metaTitle;
        if (metaDescription !== undefined) page.metaDescription = metaDescription;
        page.lastUpdatedBy = req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : page.lastUpdatedBy;

        await page.save();

        res.json({ page, message: 'Legal page updated' });
    } catch (err) {
        console.error('updateLegalPage error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/** DELETE /api/admin/legal-pages/:slug — delete a legal page */
export async function deleteLegalPage(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const page = await LegalPage.findOneAndDelete({ slug });

        if (!page) {
            res.status(404).json({ error: 'Legal page not found' });
            return;
        }

        res.json({ message: 'Legal page deleted' });
    } catch (err) {
        console.error('deleteLegalPage error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
