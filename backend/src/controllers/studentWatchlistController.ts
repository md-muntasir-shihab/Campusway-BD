import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import StudentWatchlist from '../models/StudentWatchlist';
import University from '../models/University';
import Resource from '../models/Resource';
import Exam from '../models/Exam';

function ensureStudent(req: AuthRequest, res: Response): string | null {
    if (!req.user) { res.status(401).json({ message: 'Not authenticated' }); return null; }
    if (req.user.role !== 'student') { res.status(403).json({ message: 'Student access only' }); return null; }
    return req.user._id;
}

const VALID_TYPES = ['university', 'resource', 'exam', 'news'] as const;

export async function getStudentWatchlist(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const typeFilter = req.query.type as string | undefined;
        const query: Record<string, unknown> = { studentId };
        if (typeFilter && VALID_TYPES.includes(typeFilter as typeof VALID_TYPES[number])) {
            query.itemType = typeFilter;
        }

        const items = await StudentWatchlist.find(query).sort({ createdAt: -1 }).lean();

        const grouped: Record<string, string[]> = {};
        for (const item of items) {
            if (!grouped[item.itemType]) grouped[item.itemType] = [];
            grouped[item.itemType].push(String(item.itemId));
        }

        const [universities, resources, exams] = await Promise.all([
            grouped.university?.length
                ? University.find({ _id: { $in: grouped.university } }).select('name slug logoUrl shortDescription').lean()
                : [],
            grouped.resource?.length
                ? Resource.find({ _id: { $in: grouped.resource } }).select('title type category fileUrl externalUrl thumbnailUrl').lean()
                : [],
            grouped.exam?.length
                ? Exam.find({ _id: { $in: grouped.exam } }).select('title subject startDate endDate bannerImageUrl').lean()
                : [],
        ]);

        const enriched = items.map(item => {
            const base = { _id: String(item._id), itemType: item.itemType, itemId: String(item.itemId), savedAt: item.createdAt };
            if (item.itemType === 'university') {
                const u = universities.find(u => String(u._id) === String(item.itemId));
                return { ...base, title: u?.name || 'Unknown', meta: { slug: u?.slug, logoUrl: u?.logoUrl, description: u?.shortDescription } };
            }
            if (item.itemType === 'resource') {
                const r = resources.find(r => String(r._id) === String(item.itemId));
                return { ...base, title: r?.title || 'Unknown', meta: { type: r?.type, category: r?.category, fileUrl: r?.fileUrl, thumbnailUrl: r?.thumbnailUrl } };
            }
            if (item.itemType === 'exam') {
                const e = exams.find(e => String(e._id) === String(item.itemId));
                return { ...base, title: e?.title || 'Unknown', meta: { subject: e?.subject, startDate: e?.startDate, bannerImageUrl: e?.bannerImageUrl } };
            }
            return { ...base, title: 'Saved Item', meta: {} };
        });

        const summary = {
            universities: grouped.university?.length || 0,
            resources: grouped.resource?.length || 0,
            exams: grouped.exam?.length || 0,
            news: grouped.news?.length || 0,
            total: items.length,
        };

        res.json({ items: enriched, summary, lastUpdatedAt: new Date().toISOString() });
    } catch (err) {
        console.error('getStudentWatchlist error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function toggleWatchlistItem(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const { itemType, itemId } = req.body;
        if (!itemType || !VALID_TYPES.includes(itemType)) {
            res.status(400).json({ message: 'Invalid itemType' });
            return;
        }
        if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
            res.status(400).json({ message: 'Invalid itemId' });
            return;
        }

        const existing = await StudentWatchlist.findOne({ studentId, itemType, itemId });
        if (existing) {
            await existing.deleteOne();
            res.json({ saved: false, message: 'Removed from watchlist' });
        } else {
            await StudentWatchlist.create({ studentId, itemType, itemId });
            res.json({ saved: true, message: 'Added to watchlist' });
        }
    } catch (err) {
        console.error('toggleWatchlistItem error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getWatchlistSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const counts = await StudentWatchlist.aggregate([
            { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
            { $group: { _id: '$itemType', count: { $sum: 1 } } },
        ]);

        const summary: Record<string, number> = { universities: 0, resources: 0, exams: 0, news: 0, total: 0 };
        for (const c of counts) {
            const key = c._id === 'university' ? 'universities' : c._id === 'resource' ? 'resources' : c._id === 'exam' ? 'exams' : 'news';
            summary[key] = c.count;
            summary.total += c.count;
        }

        res.json({ summary });
    } catch (err) {
        console.error('getWatchlistSummary error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function checkWatchlistStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const { itemType, itemId } = req.query;
        if (!itemType || !itemId) {
            res.status(400).json({ message: 'itemType and itemId required' });
            return;
        }

        const exists = await StudentWatchlist.exists({
            studentId,
            itemType: String(itemType),
            itemId: String(itemId),
        });

        res.json({ saved: Boolean(exists) });
    } catch (err) {
        console.error('checkWatchlistStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
