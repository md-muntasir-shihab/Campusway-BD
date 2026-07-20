import { Router, Request, Response } from 'express';
import { University, UniversityCategory, UniversityCluster, News } from '../models';

const router = Router();

/**
 * GET /sitemap.xml
 * Dynamically generates a valid XML sitemap for search engines.
 */
router.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
        const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://campusway.net';

        // Static routes
        const staticPaths = [
            '',
            '/universities',
            '/news',
            '/exams',
            '/pricing',
            '/about',
            '/contact',
            '/help',
        ];

        // Fetch dynamic items in parallel
        const [universities, categories, clusters, newsArticles] = await Promise.all([
            University.find({ isPublished: { $ne: false } }, 'slug updatedAt').lean(),
            UniversityCategory.find({}, 'slug updatedAt').lean(),
            UniversityCluster.find({}, 'slug updatedAt').lean(),
            News.find({ status: 'published' }, 'slug updatedAt createdAt publishedAt').lean(),
        ]);

        const urls: { loc: string; lastmod?: string; changefreq: string; priority: string }[] = [];

        // Add static URLs
        for (const path of staticPaths) {
            urls.push({
                loc: `${baseUrl}${path}`,
                changefreq: path === '' ? 'daily' : 'weekly',
                priority: path === '' ? '1.0' : '0.8',
            });
        }

        // Add University URLs
        for (const uni of universities) {
            if (uni.slug) {
                urls.push({
                    loc: `${baseUrl}/universities/${uni.slug}`,
                    lastmod: (uni.updatedAt ? new Date(uni.updatedAt) : new Date()).toISOString(),
                    changefreq: 'weekly',
                    priority: '0.9',
                });
            }
        }

        // Add Category URLs
        for (const cat of categories) {
            if (cat.slug) {
                urls.push({
                    loc: `${baseUrl}/universities/category/${cat.slug}`,
                    lastmod: (cat.updatedAt ? new Date(cat.updatedAt) : new Date()).toISOString(),
                    changefreq: 'weekly',
                    priority: '0.8',
                });
            }
        }

        // Add Cluster URLs
        for (const cluster of clusters) {
            if (cluster.slug) {
                urls.push({
                    loc: `${baseUrl}/universities/cluster/${cluster.slug}`,
                    lastmod: (cluster.updatedAt ? new Date(cluster.updatedAt) : new Date()).toISOString(),
                    changefreq: 'weekly',
                    priority: '0.8',
                });
            }
        }

        // Add News URLs
        for (const article of newsArticles) {
            if (article.slug) {
                const dateVal = article.updatedAt || article.publishedAt || article.createdAt;
                urls.push({
                    loc: `${baseUrl}/news/${article.slug}`,
                    lastmod: (dateVal ? new Date(dateVal) : new Date()).toISOString(),
                    changefreq: 'daily',
                    priority: '0.7',
                });
            }
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        for (const u of urls) {
            xml += `  <url>\n`;
            xml += `    <loc>${u.loc}</loc>\n`;
            if (u.lastmod) {
                xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
            }
            xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
            xml += `    <priority>${u.priority}</priority>\n`;
            xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.status(200).send(xml);
    } catch (err: any) {
        console.error('Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
});

/**
 * GET /robots.txt
 * Serves a dynamic robots.txt pointing to the sitemap.
 */
router.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://campusway.net';
    const robotsContent = `User-agent: *
Allow: /
Disallow: /__cw_admin__/
Disallow: /admin/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.status(200).send(robotsContent);
});

export default router;
