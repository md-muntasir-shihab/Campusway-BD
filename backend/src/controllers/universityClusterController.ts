import { Request, Response } from 'express';
import mongoose from 'mongoose';
import slugify from 'slugify';
import University from '../models/University';
import UniversityCluster from '../models/UniversityCluster';
import UniversityCategory from '../models/UniversityCategory';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import {
    backfillUniversityTaxonomyIfNeeded,
    normalizeExamCenters,
    reconcileUniversityClusterAssignments,
    syncUniversityClusterSharedConfig,
} from '../services/universitySyncService';
import {
    buildPublicClusterExclusionQuery,
    combineMongoFilters,
} from '../utils/publicFixtureFilters';
import { ResponseBuilder } from '../utils/responseBuilder';

function normalizeClusterSlug(name: string, fallbackSlug?: string): string {
    const slug = slugify(name || fallbackSlug || '', { lower: true, strict: true });
    return slug || `cluster-${Date.now()}`;
}

function uniqueObjectIds(values: Array<string | mongoose.Types.ObjectId>): mongoose.Types.ObjectId[] {
    const seen = new Set<string>();
    const normalized: mongoose.Types.ObjectId[] = [];
    values.forEach((item) => {
        const asString = String(item);
        if (!mongoose.Types.ObjectId.isValid(asString)) return;
        if (seen.has(asString)) return;
        seen.add(asString);
        normalized.push(new mongoose.Types.ObjectId(asString));
    });
    return normalized;
}

function normalizeCategories(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return values.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeCategoryIds(values: unknown): mongoose.Types.ObjectId[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const normalized: mongoose.Types.ObjectId[] = [];
    values.forEach((item) => {
        const id = String(item || '').trim();
        if (!mongoose.Types.ObjectId.isValid(id)) return;
        if (seen.has(id)) return;
        seen.add(id);
        normalized.push(new mongoose.Types.ObjectId(id));
    });
    return normalized;
}

function toOptionalObjectId(value: string | undefined): mongoose.Types.ObjectId | null {
    if (!value) return null;
    return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

function parseOptionalDate(value: unknown): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeClusterDates(payload: Record<string, unknown>) {
    const source = (payload.dates && typeof payload.dates === 'object')
        ? (payload.dates as Record<string, unknown>)
        : payload;
    return {
        applicationStartDate: parseOptionalDate(source.applicationStartDate),
        applicationEndDate: parseOptionalDate(source.applicationEndDate),
        scienceExamDate: String(source.scienceExamDate || '').trim(),
        commerceExamDate: String(source.commerceExamDate || source.businessExamDate || '').trim(),
        artsExamDate: String(source.artsExamDate || '').trim(),
        admissionWebsite: String(source.admissionWebsite || source.admissionUrl || '').trim(),
        examCenters: normalizeExamCenters(source.examCenters),
    };
}

function toIso(value: unknown): string {
    if (!value) return '';
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function findNearestUpcomingDate(values: unknown[], now: Date): string {
    return values
        .map((value) => (value ? new Date(String(value)) : null))
        .filter((item): item is Date => Boolean(item) && !Number.isNaN(item!.getTime()) && item!.getTime() >= now.getTime())
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() || '';
}

export async function adminGetUniversityClusters(req: Request, res: Response): Promise<void> {
    try {
        await backfillUniversityTaxonomyIfNeeded();
        const status = String(req.query.status || 'all').toLowerCase();
        const filter: Record<string, unknown> = {};
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;

        const clusters = await UniversityCluster.find(filter).sort({ homeOrder: 1, name: 1 }).lean();
        const counts = await University.aggregate([
            { $match: { clusterId: { $ne: null }, isArchived: { $ne: true } } },
            { $group: { _id: '$clusterId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map<string, number>();
        counts.forEach((item) => countMap.set(String(item._id), Number(item.count || 0)));

        // Aggregate seat stats per cluster
        const parseSeats = (val: unknown): number => {
            if (!val) return 0;
            const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
            return Number.isNaN(num) ? 0 : num;
        };
        const clusterIds = clusters.map(c => c._id);
        const allClusterUnis = await University.find({ clusterId: { $in: clusterIds }, isArchived: { $ne: true } })
            .select('clusterId totalSeats scienceSeats seatsScienceEng artsSeats seatsArtsHum businessSeats seatsBusiness')
            .lean();
        const seatStatsMap = new Map<string, { totalSeats: number; scienceSeats: number; artsSeats: number; commerceSeats: number }>();
        for (const uni of allClusterUnis) {
            const cid = String(uni.clusterId);
            const existing = seatStatsMap.get(cid) || { totalSeats: 0, scienceSeats: 0, artsSeats: 0, commerceSeats: 0 };
            const row = uni as Record<string, unknown>;
            existing.totalSeats += parseSeats(row.totalSeats);
            existing.scienceSeats += parseSeats(row.scienceSeats || row.seatsScienceEng);
            existing.artsSeats += parseSeats(row.artsSeats || row.seatsArtsHum);
            existing.commerceSeats += parseSeats(row.businessSeats || row.seatsBusiness);
            seatStatsMap.set(cid, existing);
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            clusters: clusters.map((cluster) => ({
                ...cluster,
                memberCount: countMap.get(String(cluster._id)) || 0,
                seatStats: seatStatsMap.get(String(cluster._id)) || { totalSeats: 0, scienceSeats: 0, artsSeats: 0, commerceSeats: 0 },
            })),
        }));
    } catch (err) {
        console.error('adminGetUniversityClusters error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch clusters.'));
    }
}

export async function adminCreateUniversityCluster(req: Request, res: Response): Promise<void> {
    try {
        const payload = req.body || {};
        const name = String(payload.name || '').trim();
        if (!name) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Cluster name is required.'));
            return;
        }

        const slug = normalizeClusterSlug(name, String(payload.slug || ''));
        const existing = await UniversityCluster.findOne({
            $or: [{ name }, { slug }],
        }).lean();
        if (existing) {
            ResponseBuilder.send(res, 409, ResponseBuilder.error('CLUSTER_DUPLICATE', 'Cluster name or slug already exists.'));
            return;
        }

        const cluster = await UniversityCluster.create({
            name,
            slug,
            description: String(payload.description || ''),
            heroImageUrl: String(payload.heroImageUrl || ''),
            isActive: payload.isActive !== false,
            memberUniversityIds: uniqueObjectIds(payload.memberUniversityIds || []),
            categoryRules: normalizeCategories(payload.categoryRules || []),
            categoryRuleIds: normalizeCategoryIds(payload.categoryRuleIds || []),
            dates: normalizeClusterDates(payload),
            syncPolicy: 'inherit_with_override',
            homeVisible: Boolean(payload.homeVisible),
            homeOrder: Number(payload.homeOrder || 0),
            homeFeedMode: (['cluster_only', 'members_only', 'both'].includes(payload.homeFeedMode) ? payload.homeFeedMode : 'both'),
            createdBy: (req as Request & { user?: { _id?: string } }).user?._id || null,
            updatedBy: (req as Request & { user?: { _id?: string } }).user?._id || null,
        });

        const resolution = await reconcileUniversityClusterAssignments((req as Request & { user?: { _id?: string } }).user?._id || null);
        const syncResult = await syncUniversityClusterSharedConfig(
            String(cluster._id),
            (req as Request & { user?: { _id?: string } }).user?._id || null,
        );

        broadcastHomeStreamEvent({
            type: 'cluster-updated',
            meta: { action: 'create', clusterId: String(cluster._id) },
        });

        ResponseBuilder.send(res, 201, ResponseBuilder.created({
            cluster,
            memberCount: resolution.clusterMemberCounts[String(cluster._id)] || 0,
            dateSync: syncResult,
            resolution
        }, 'Cluster created successfully.'));
    } catch (err) {
        if ((err as { code?: number }).code === 11000) {
            ResponseBuilder.send(res, 409, ResponseBuilder.error('CLUSTER_DUPLICATE', 'Cluster name or slug already exists.'));
            return;
        }
        console.error('adminCreateUniversityCluster error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to create cluster.'));
    }
}

export async function adminGetUniversityClusterById(req: Request, res: Response): Promise<void> {
    try {
        await backfillUniversityTaxonomyIfNeeded();
        const cluster = await UniversityCluster.findById(req.params.id).lean();
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }
        const members = await University.find({ _id: { $in: cluster.memberUniversityIds || [] } })
            .select('_id name shortForm category')
            .lean();
        const effectiveMembers = await University.find({ clusterId: cluster._id, isArchived: { $ne: true } })
            .select('_id name shortForm category')
            .sort({ name: 1 })
            .lean();
        const categoryRuleIds = normalizeCategoryIds(
            (cluster as unknown as { categoryRuleIds?: unknown[] }).categoryRuleIds || [],
        );
        const ruleCategories = categoryRuleIds.length > 0
            ? await UniversityCategory.find({ _id: { $in: categoryRuleIds } }).select('_id name labelBn').lean()
            : [];
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ cluster, members, effectiveMembers, ruleCategories }));
    } catch (err) {
        console.error('adminGetUniversityClusterById error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load cluster.'));
    }
}

export async function adminUpdateUniversityCluster(req: Request, res: Response): Promise<void> {
    try {
        const clusterId = String(req.params.id || '');
        const payload = req.body || {};
        const cluster = await UniversityCluster.findById(clusterId);
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        if (payload.name) {
            cluster.name = String(payload.name).trim();
        }
        if (payload.slug) {
            cluster.slug = normalizeClusterSlug(cluster.name, String(payload.slug || ''));
        }
        if (payload.name !== undefined || payload.slug !== undefined) {
            const duplicate = await UniversityCluster.findOne({
                _id: { $ne: cluster._id },
                $or: [{ name: cluster.name }, { slug: cluster.slug }],
            }).select('_id').lean();
            if (duplicate) {
                ResponseBuilder.send(res, 409, ResponseBuilder.error('CLUSTER_DUPLICATE', 'Cluster name or slug already exists.'));
                return;
            }
        }
        if (payload.description !== undefined) cluster.description = String(payload.description || '');
        if (payload.heroImageUrl !== undefined) cluster.heroImageUrl = String(payload.heroImageUrl || '');
        if (payload.isActive !== undefined) cluster.isActive = Boolean(payload.isActive);
        if (payload.memberUniversityIds) {
            cluster.memberUniversityIds = uniqueObjectIds(payload.memberUniversityIds);
        }
        if (payload.categoryRules) {
            cluster.categoryRules = normalizeCategories(payload.categoryRules);
        }
        if (payload.categoryRuleIds !== undefined) {
            (cluster as unknown as { categoryRuleIds?: mongoose.Types.ObjectId[] }).categoryRuleIds = normalizeCategoryIds(payload.categoryRuleIds);
        }
        if (payload.dates || payload.examCenters) cluster.dates = normalizeClusterDates(payload);
        if (payload.homeVisible !== undefined) cluster.homeVisible = Boolean(payload.homeVisible);
        if (payload.homeOrder !== undefined) cluster.homeOrder = Number(payload.homeOrder || 0);
        if (payload.homeFeedMode !== undefined && ['cluster_only', 'members_only', 'both'].includes(payload.homeFeedMode)) {
            (cluster as unknown as { homeFeedMode: string }).homeFeedMode = payload.homeFeedMode;
        }
        cluster.updatedBy = toOptionalObjectId((req as Request & { user?: { _id?: string } }).user?._id);

        await cluster.save();

        const resolution = await reconcileUniversityClusterAssignments((req as Request & { user?: { _id?: string } }).user?._id || null);
        const syncResult = await syncUniversityClusterSharedConfig(
            String(cluster._id),
            (req as Request & { user?: { _id?: string } }).user?._id || null,
        );

        broadcastHomeStreamEvent({
            type: 'cluster-updated',
            meta: { action: 'update', clusterId: String(cluster._id) },
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            cluster,
            memberCount: resolution.clusterMemberCounts[String(cluster._id)] || 0,
            dateSync: syncResult,
            resolution
        }, 'Cluster updated successfully.'));
    } catch (err) {
        if ((err as { code?: number }).code === 11000) {
            ResponseBuilder.send(res, 409, ResponseBuilder.error('CLUSTER_DUPLICATE', 'Cluster name or slug already exists.'));
            return;
        }
        console.error('adminUpdateUniversityCluster error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to update cluster.'));
    }
}

export async function adminResolveUniversityClusterMembers(req: Request, res: Response): Promise<void> {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster.findById(clusterId).lean();
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        const resolution = await reconcileUniversityClusterAssignments((req as Request & { user?: { _id?: string } }).user?._id || null);
        const manualMemberIds = uniqueObjectIds(cluster.memberUniversityIds || []).map((item) => String(item));
        const effectiveMembers = await University.find({ clusterId: cluster._id, isArchived: { $ne: true } })
            .select('_id')
            .lean();
        const effectiveMemberIds = effectiveMembers.map((item) => String(item._id));
        const suggestedMemberIds = effectiveMemberIds.filter((id) => !manualMemberIds.includes(id));

        broadcastHomeStreamEvent({
            type: 'cluster-updated',
            meta: { action: 'resolve', clusterId },
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            memberCount: effectiveMemberIds.length,
            manualMembers: manualMemberIds,
            suggestedMembers: suggestedMemberIds,
            effectiveMembers: effectiveMemberIds,
            manualMembersCount: manualMemberIds.length,
            suggestedMembersCount: suggestedMemberIds.length,
            effectiveMembersCount: effectiveMemberIds.length,
            warnings: resolution.warnings.filter((item) => item.clusterIds.includes(clusterId))
        }, 'Cluster members resolved with manual-wins policy.'));
    } catch (err) {
        console.error('adminResolveUniversityClusterMembers error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to resolve cluster members.'));
    }
}

export async function adminSyncUniversityClusterDates(req: Request, res: Response): Promise<void> {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster.findById(clusterId);
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        if (req.body?.dates) {
            cluster.dates = normalizeClusterDates(req.body);
            cluster.updatedBy = toOptionalObjectId((req as Request & { user?: { _id?: string } }).user?._id);
            await cluster.save();
        }

        const result = await syncUniversityClusterSharedConfig(
            clusterId,
            (req as Request & { user?: { _id?: string } }).user?._id || null,
        );
        broadcastHomeStreamEvent({
            type: 'cluster-updated',
            meta: { action: 'sync-dates', clusterId, ...result },
        });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ ...result }, 'Cluster dates synced.'));
    } catch (err) {
        console.error('adminSyncUniversityClusterDates error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to sync cluster dates.'));
    }
}

export async function adminDeleteUniversityCluster(req: Request, res: Response): Promise<void> {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster.findById(clusterId);
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        cluster.isActive = false;
        cluster.updatedBy = toOptionalObjectId((req as Request & { user?: { _id?: string } }).user?._id);
        await cluster.save();

        const resolution = await reconcileUniversityClusterAssignments((req as Request & { user?: { _id?: string } }).user?._id || null);

        broadcastHomeStreamEvent({
            type: 'cluster-updated',
            meta: { action: 'deactivate', clusterId },
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resolution }, 'Cluster deactivated successfully.'));
    } catch (err) {
        console.error('adminDeleteUniversityCluster error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to deactivate cluster.'));
    }
}

export async function adminPermanentDeleteUniversityCluster(req: Request, res: Response): Promise<void> {
    try {
        const clusterId = String(req.params.id || '');
        const deleteMode = String(req.query.mode || req.body?.mode || 'cluster_only').toLowerCase();
        const cluster = await UniversityCluster.findById(clusterId).lean();
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        const linkedCount = await University.countDocuments({
            isArchived: { $ne: true },
            $or: [
                { clusterId: cluster._id },
                { clusterName: String(cluster.name || '').trim() },
                { clusterGroup: String(cluster.name || '').trim() },
            ],
        });

        if (deleteMode === 'cascade') {
            // Delete cluster AND all linked universities
            await University.updateMany(
                {
                    $or: [
                        { clusterId: cluster._id },
                        { clusterName: String(cluster.name || '').trim() },
                        { clusterGroup: String(cluster.name || '').trim() },
                    ],
                },
                {
                    $set: {
                        isArchived: true,
                        archivedAt: new Date(),
                        archivedBy: toOptionalObjectId((req as Request & { user?: { _id?: string } }).user?._id),
                    },
                },
            );
            await UniversityCluster.deleteOne({ _id: cluster._id });
            broadcastHomeStreamEvent({
                type: 'cluster-updated',
                meta: { action: 'permanent-delete-cascade', clusterId },
            });
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ linkedCount, deletedUniversities: linkedCount }, 'Cluster and all linked universities permanently deleted.'));
        } else if (deleteMode === 'detach') {
            // Delete cluster only, detach universities (remove clusterId)
            await University.updateMany(
                {
                    $or: [
                        { clusterId: cluster._id },
                        { clusterName: String(cluster.name || '').trim() },
                        { clusterGroup: String(cluster.name || '').trim() },
                    ],
                },
                {
                    $set: { clusterId: null, clusterName: '', clusterGroup: '' },
                },
            );
            await UniversityCluster.deleteOne({ _id: cluster._id });
            broadcastHomeStreamEvent({
                type: 'cluster-updated',
                meta: { action: 'permanent-delete-detach', clusterId },
            });
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ linkedCount, detachedUniversities: linkedCount }, 'Cluster deleted. Universities detached and kept safe.'));
        } else {
            // Original behavior: only allow delete if empty
            if (linkedCount > 0) {
                ResponseBuilder.send(res, 409, ResponseBuilder.error('CLUSTER_NOT_EMPTY', 'Cluster has linked universities. Use mode=cascade to delete all, or mode=detach to keep universities.'));
                return;
            }
            await UniversityCluster.deleteOne({ _id: cluster._id });
            broadcastHomeStreamEvent({
                type: 'cluster-updated',
                meta: { action: 'permanent-delete', clusterId },
            });
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ linkedCount: 0 }, 'Cluster permanently deleted.'));
        }
    } catch (err) {
        console.error('adminPermanentDeleteUniversityCluster error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to permanently delete cluster.'));
    }
}

export async function getFeaturedUniversityClusters(req: Request, res: Response): Promise<void> {
    try {
        await backfillUniversityTaxonomyIfNeeded();
        const limit = Math.min(20, Math.max(1, Number(req.query.limit || 8)));
        const clusters = await UniversityCluster.find(combineMongoFilters(
            { isActive: true, homeVisible: true },
            buildPublicClusterExclusionQuery(),
        ))
            .select('name slug description heroImageUrl homeOrder dates homeFeedMode')
            .sort({ homeOrder: 1, name: 1 })
            .limit(limit)
            .lean();

        const clusterIds = clusters.map((cluster) => cluster._id);
        const counts = await University.aggregate([
            { $match: { clusterId: { $in: clusterIds }, isArchived: { $ne: true }, isActive: true } },
            { $group: { _id: '$clusterId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map<string, number>();
        counts.forEach((item) => countMap.set(String(item._id), Number(item.count || 0)));

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            clusters: clusters.map((cluster) => ({
                ...cluster,
                memberCount: countMap.get(String(cluster._id)) || 0,
            })),
        }));
    } catch (err) {
        console.error('getFeaturedUniversityClusters error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch featured clusters.'));
    }
}

export async function getPublicUniversityClusterMembers(req: Request, res: Response): Promise<void> {
    try {
        await backfillUniversityTaxonomyIfNeeded();
        const slug = String(req.params.slug || '').trim();
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));

        let cluster = await UniversityCluster.findOne({ slug, isActive: true }).lean();
        if (!cluster) {
            const normalizedRequestedSlug = normalizeClusterSlug('', slug);
            const fallbackMatches = await UniversityCluster.find({ isActive: true })
                .select('_id name slug description heroImageUrl homeOrder dates homeVisible')
                .lean();
            cluster = fallbackMatches.find((candidate) => (
                normalizeClusterSlug(String(candidate.name || ''), String(candidate.slug || '')) === normalizedRequestedSlug
            )) || null;
        }
        if (!cluster) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Cluster not found.'));
            return;
        }

        const filter = { clusterId: cluster._id, isArchived: { $ne: true }, isActive: true };
        const total = await University.countDocuments(filter);
        const allMembers = await University.find(filter)
            .select('category applicationStart applicationStartDate applicationEnd applicationEndDate scienceExamDate examDateScience artsExamDate examDateArts businessExamDate examDateBusiness admissionWebsite admissionUrl examCenters totalSeats scienceSeats seatsScienceEng artsSeats seatsArtsHum businessSeats seatsBusiness')
            .lean();
        const universities = await University.find(filter)
            .sort({ featured: -1, featuredOrder: 1, name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const categories = Array.from(new Set(allMembers.map((item) => String(item.category || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const now = new Date();
        const memberStartDates = allMembers.map((item) => (
            (item as { applicationStartDate?: unknown; applicationStart?: unknown }).applicationStartDate
            || (item as { applicationStartDate?: unknown; applicationStart?: unknown }).applicationStart
        ));
        const memberEndDates = allMembers.map((item) => (
            (item as { applicationEndDate?: unknown; applicationEnd?: unknown }).applicationEndDate
            || (item as { applicationEndDate?: unknown; applicationEnd?: unknown }).applicationEnd
        ));
        const memberScienceDates = allMembers.map((item) => (
            (item as { scienceExamDate?: unknown; examDateScience?: unknown }).scienceExamDate
            || (item as { scienceExamDate?: unknown; examDateScience?: unknown }).examDateScience
        ));
        const memberArtsDates = allMembers.map((item) => (
            (item as { artsExamDate?: unknown; examDateArts?: unknown }).artsExamDate
            || (item as { artsExamDate?: unknown; examDateArts?: unknown }).examDateArts
        ));
        const memberBusinessDates = allMembers.map((item) => (
            (item as { businessExamDate?: unknown; examDateBusiness?: unknown }).businessExamDate
            || (item as { businessExamDate?: unknown; examDateBusiness?: unknown }).examDateBusiness
        ));
        const memberAdmissionWebsite = allMembers.find((item) => {
            const row = item as { admissionWebsite?: unknown; admissionUrl?: unknown };
            return row.admissionWebsite || row.admissionUrl;
        }) as { admissionWebsite?: unknown; admissionUrl?: unknown } | undefined;
        const nearestDeadline = findNearestUpcomingDate(memberEndDates, now);
        const nearestExam = findNearestUpcomingDate([...memberScienceDates, ...memberArtsDates, ...memberBusinessDates], now);
        const clusterDates = (cluster as { dates?: Record<string, unknown> }).dates || {};
        const examCentersPreview = Array.from(new Set(
            allMembers.flatMap((item) => Array.isArray(item.examCenters) ? item.examCenters.map((center) => String(center?.city || '').trim()) : [])
                .filter(Boolean),
        )).slice(0, 6);

        // Aggregate seat counts from all member universities
        const parseSeats = (val: unknown): number => {
            if (!val) return 0;
            const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
            return Number.isNaN(num) ? 0 : num;
        };
        let totalSeats = 0, scienceSeats = 0, artsSeats = 0, commerceSeats = 0;
        for (const m of allMembers) {
            const row = m as Record<string, unknown>;
            totalSeats += parseSeats(row.totalSeats);
            scienceSeats += parseSeats(row.scienceSeats || row.seatsScienceEng);
            artsSeats += parseSeats(row.artsSeats || row.seatsArtsHum);
            commerceSeats += parseSeats(row.businessSeats || row.seatsBusiness);
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            cluster,
            summary: {
                memberCount: total,
                categories,
                nearestDeadline,
                nearestExam,
                applicationStartDate: toIso(clusterDates.applicationStartDate) || findNearestUpcomingDate(memberStartDates, new Date(0)),
                applicationEndDate: toIso(clusterDates.applicationEndDate) || findNearestUpcomingDate(memberEndDates, new Date(0)) || nearestDeadline,
                scienceExamDate: toIso(clusterDates.scienceExamDate) || findNearestUpcomingDate(memberScienceDates, now),
                artsExamDate: toIso(clusterDates.artsExamDate) || findNearestUpcomingDate(memberArtsDates, now),
                businessExamDate: toIso(clusterDates.commerceExamDate || clusterDates.businessExamDate) || findNearestUpcomingDate(memberBusinessDates, now),
                admissionWebsite: String(clusterDates.admissionWebsite || memberAdmissionWebsite?.admissionWebsite || memberAdmissionWebsite?.admissionUrl || '').trim(),
                examCentersPreview,
                totalSeats,
                scienceSeats,
                artsSeats,
                commerceSeats,
            },
            universities,
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        }));
    } catch (err) {
        console.error('getPublicUniversityClusterMembers error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch cluster members.'));
    }
}
