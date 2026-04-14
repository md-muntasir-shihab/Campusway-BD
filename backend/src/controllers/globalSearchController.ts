import { Request, Response } from 'express';
import University from '../models/University';
import Exam from '../models/Exam';
import News from '../models/News';

/**
 * GET /search?q=<query>
 * Global search across Universities, Exams, and News.
 * Returns up to 5 results per category.
 */
export async function globalSearch(req: Request, res: Response): Promise<void> {
    try {
        const rawQuery = String(req.query.q || '').trim();

        if (rawQuery.length < 2) {
            res.json({
                ok: true,
                universities: [],
                exams: [],
                news: [],
            });
            return;
        }

        // Escape special regex characters for safe regex usage
        const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const [universities, exams, news] = await Promise.all([
            University.find(
                {
                    isActive: true,
                    isArchived: { $ne: true },
                    $or: [
                        { name: regex },
                        { shortForm: regex },
                    ],
                },
                'name shortForm slug category logoUrl',
            )
                .sort({ featured: -1, name: 1 })
                .limit(5)
                .lean(),

            Exam.find(
                {
                    isActive: { $ne: false },
                    $or: [
                        { title: regex },
                        { title_bn: regex },
                        { subject: regex },
                    ],
                },
                'title slug subject status group_category startDate endDate',
            )
                .sort({ startDate: -1 })
                .limit(5)
                .lean(),

            News.find(
                {
                    status: 'published',
                    isPublished: true,
                    $or: [
                        { title: regex },
                        { shortSummary: regex },
                        { category: regex },
                    ],
                },
                'title slug category coverImageUrl shortSummary publishDate',
            )
                .sort({ publishDate: -1 })
                .limit(5)
                .lean(),
        ]);

        // Shape into slim result objects
        const universityResults = universities.map((u) => ({
            _id: String(u._id),
            name: u.name,
            shortForm: u.shortForm || '',
            slug: u.slug,
            category: u.category || '',
            logoUrl: u.logoUrl || null,
            type: 'university' as const,
        }));

        const examResults = exams.map((e) => ({
            _id: String(e._id),
            title: e.title,
            slug: e.slug || '',
            subject: e.subject || '',
            status: e.status || 'draft',
            groupCategory: e.group_category || '',
            startDate: e.startDate ? new Date(e.startDate).toISOString() : null,
            endDate: e.endDate ? new Date(e.endDate).toISOString() : null,
            type: 'exam' as const,
        }));

        const newsResults = news.map((n) => ({
            _id: String(n._id),
            title: n.title,
            slug: n.slug,
            category: n.category || '',
            coverImageUrl: n.coverImageUrl || null,
            shortSummary: n.shortSummary || '',
            publishDate: n.publishDate ? new Date(n.publishDate).toISOString() : null,
            type: 'news' as const,
        }));

        res.json({
            ok: true,
            universities: universityResults,
            exams: examResults,
            news: newsResults,
        });
    } catch (error) {
        console.error('[globalSearch] Error:', error);
        res.status(500).json({ ok: false, message: 'Internal server error' });
    }
}
