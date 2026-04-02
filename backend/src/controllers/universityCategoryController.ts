import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import mongoose from 'mongoose';
import slugify from 'slugify';
import University from '../models/University';
import UniversityCategory from '../models/UniversityCategory';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import {
    backfillUniversityTaxonomyIfNeeded,
    normalizeExamCenters,
    renameUniversityCategoryReferences,
    syncUniversityCategorySharedConfig,
} from '../services/universitySyncService';

function normalizeSlug(name: string, requestedSlug?: string): string {
    const source = requestedSlug || name;
    const slug = slugify(source || '', { lower: true, strict: true });
    return slug || `category-${Date.now()}`;
}

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const id = String(value || '').trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
}

function parseOptionalDate(value: unknown): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSharedConfig(payload: Record<string, unknown>) {
    const source = (payload.sharedConfig && typeof payload.sharedConfig === 'object')
        ? (payload.sharedConfig as Record<string, unknown>)
        : payload;
    return {
        applicationStartDate: parseOptionalDate(source.applicationStartDate),
        applicationEndDate: parseOptionalDate(source.applicationEndDate),
        scienceExamDate: String(source.scienceExamDate || '').trim(),
        artsExamDate: String(source.artsExamDate || '').trim(),
        businessExamDate: String(source.businessExamDate || '').trim(),
        examCenters: normalizeExamCenters(source.examCenters),
    };
}

export async function adminGetUniversityCategoryMaster(req: Request, res: Response): Promise<void> {
    try {
        await backfillUniversityTaxonomyIfNeeded();
        const status = String(req.query.status || 'all').toLowerCase();
        const q = String(req.query.q || '').trim();
        const filter: Record<string, unknown> = {};

        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;
        if (q) {
            const safeQ = escapeRegex(q);
            filter.$or = [
                { name: { $regex: safeQ, $options: 'i' } },
                { labelBn: { $regex: safeQ, $options: 'i' } },
                { labelEn: { $regex: safeQ, $options: 'i' } },
                { slug: { $regex: safeQ, $options: 'i' } },
            ];
        }

        const categories = await UniversityCategory.find(filter)
            .sort({ homeOrder: 1, name: 1 })
            .lean();

        const counts = await University.aggregate([
            { $match: { isArchived: { $ne: true } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        const countMap = new Map<string, number>();
        counts.forEach((item) => {
            const name = String(item._id || '').trim();
            if (name) countMap.set(name, Number(item.count || 0));
        });

        res.json({
            categories: categories.map((item) => ({
                ...item,
                count: countMap.get(String(item.name || '').trim()) || 0,
            })),
        });
    } catch (err) {
        console.error('adminGetUniversityCategoryMaster error:', err);
        res.status(500).json({ message: 'Failed to fetch university categories.' });
    }
}

export async function adminCreateUniversityCategory(req: Request, res: Response): Promise<void> {
    try {
        const payload = req.body || {};
        const name = String(payload.name || '').trim();
        if (!name) {
            res.status(400).json({ message: 'Category name is required.' });
            return;
        }

        const slug = normalizeSlug(name, String(payload.slug || ''));
        const exists = await UniversityCategory.findOne({ $or: [{ name }, { slug }] }).lean();
        if (exists) {
            res.status(409).json({ message: 'Category name or slug already exists.', code: 'CATEGORY_DUPLICATE' });
            return;
        }

        const category = await UniversityCategory.create({
            name,
            slug,
            labelBn: String(payload.labelBn || ''),
            labelEn: String(payload.labelEn || ''),
            colorToken: String(payload.colorToken || ''),
            icon: String(payload.icon || ''),
            isActive: payload.isActive !== false,
            homeHighlight: Boolean(payload.homeHighlight),
            homeOrder: Number(payload.homeOrder || 0),
            sharedConfig: normalizeSharedConfig(payload),
            createdBy: asObjectId((req as Request & { user?: { _id?: string } }).user?._id),
            updatedBy: asObjectId((req as Request & { user?: { _id?: string } }).user?._id),
        });

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { action: 'create', categoryId: String(category._id) },
        });

        res.status(201).json({ category, message: 'University category created.' });
    } catch (err) {
        if ((err as { code?: number }).code === 11000) {
            res.status(409).json({ message: 'Category name or slug already exists.', code: 'CATEGORY_DUPLICATE' });
            return;
        }
        console.error('adminCreateUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to create university category.' });
    }
}

export async function adminUpdateUniversityCategory(req: Request, res: Response): Promise<void> {
    try {
        const payload = req.body || {};
        const category = await UniversityCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }

        const previousName = String(category.name || '').trim();

        if (payload.name !== undefined) {
            const nextName = String(payload.name || '').trim();
            if (!nextName) {
                res.status(400).json({ message: 'Category name cannot be empty.' });
                return;
            }
            category.name = nextName;
        }
        if (payload.slug !== undefined) {
            category.slug = normalizeSlug(category.name, String(payload.slug || ''));
        }
        if (payload.name !== undefined || payload.slug !== undefined) {
            const duplicate = await UniversityCategory.findOne({
                _id: { $ne: category._id },
                $or: [{ name: category.name }, { slug: category.slug }],
            }).select('_id').lean();
            if (duplicate) {
                res.status(409).json({ message: 'Category name or slug already exists.', code: 'CATEGORY_DUPLICATE' });
                return;
            }
        }
        if (payload.labelBn !== undefined) category.labelBn = String(payload.labelBn || '');
        if (payload.labelEn !== undefined) category.labelEn = String(payload.labelEn || '');
        if (payload.colorToken !== undefined) category.colorToken = String(payload.colorToken || '');
        if (payload.icon !== undefined) category.icon = String(payload.icon || '');
        if (payload.isActive !== undefined) category.isActive = Boolean(payload.isActive);
        if (payload.homeHighlight !== undefined) category.homeHighlight = Boolean(payload.homeHighlight);
        if (payload.homeOrder !== undefined) category.homeOrder = Number(payload.homeOrder || 0);
        if (payload.sharedConfig !== undefined || payload.applicationStartDate !== undefined || payload.examCenters !== undefined) {
            category.sharedConfig = normalizeSharedConfig(payload);
        }
        category.updatedBy = asObjectId((req as Request & { user?: { _id?: string } }).user?._id);

        await category.save();
        await renameUniversityCategoryReferences(String(category._id), previousName, String(category.name || '').trim());

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { action: 'update', categoryId: String(category._id) },
        });

        res.json({ category, message: 'University category updated.' });
    } catch (err) {
        if ((err as { code?: number }).code === 11000) {
            res.status(409).json({ message: 'Category name or slug already exists.', code: 'CATEGORY_DUPLICATE' });
            return;
        }
        console.error('adminUpdateUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to update university category.' });
    }
}

export async function adminToggleUniversityCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await UniversityCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        category.isActive = !category.isActive;
        category.updatedBy = asObjectId((req as Request & { user?: { _id?: string } }).user?._id);
        await category.save();

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { action: 'toggle', categoryId: String(category._id), isActive: category.isActive },
        });

        res.json({ category, message: `Category ${category.isActive ? 'activated' : 'deactivated'}.` });
    } catch (err) {
        console.error('adminToggleUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to toggle category status.' });
    }
}

export async function adminDeleteUniversityCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await UniversityCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }

        category.isActive = false;
        category.updatedBy = asObjectId((req as Request & { user?: { _id?: string } }).user?._id);
        await category.save();

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { action: 'delete', categoryId: String(category._id) },
        });

        res.json({ message: 'Category archived (soft delete).' });
    } catch (err) {
        console.error('adminDeleteUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to archive category.' });
    }
}

export async function adminSyncUniversityCategoryConfig(req: Request, res: Response): Promise<void> {
    try {
        const category = await UniversityCategory.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }

        if (req.body && (req.body.sharedConfig !== undefined || req.body.examCenters !== undefined || req.body.applicationStartDate !== undefined)) {
            category.sharedConfig = normalizeSharedConfig(req.body || {});
            category.updatedBy = asObjectId((req as Request & { user?: { _id?: string } }).user?._id);
            await category.save();
        }

        const syncResult = await syncUniversityCategorySharedConfig(
            String(category._id),
            (req as Request & { user?: { _id?: string } }).user?._id || null,
        );

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { action: 'sync', categoryId: String(category._id), ...syncResult },
        });

        res.json({
            category,
            syncResult,
            message: 'Category configuration synced to universities.',
        });
    } catch (err) {
        console.error('adminSyncUniversityCategoryConfig error:', err);
        res.status(500).json({ message: 'Failed to sync category configuration.' });
    }
}
