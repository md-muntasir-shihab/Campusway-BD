import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import Service from '../models/Service';
import ServiceCategory from '../models/ServiceCategory';
import ServicePricingPlan from '../models/ServicePricingPlan';
import ServiceAuditLog from '../models/ServiceAuditLog';

/* ═══════════════════════════════
   PUBLIC APIS
   ═══════════════════════════════ */

export async function getServices(req: Request, res: Response): Promise<void> {
    try {
        const { category, q, page = '1', limit = '12', sort = 'display_order' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        const filter: any = { is_active: true };

        // Handle category filter - matching by ObjectId
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Handle search query across both languages
        if (q) {
            const safeQ = escapeRegex(String(q));
            filter.$or = [
                { title_en: { $regex: safeQ, $options: 'i' } },
                { title_bn: { $regex: safeQ, $options: 'i' } },
                { description_en: { $regex: safeQ, $options: 'i' } },
                { description_bn: { $regex: safeQ, $options: 'i' } }
            ];
        }

        const services = await Service.find(filter)
            .sort(sort === 'featured' ? { is_featured: -1, display_order: 1 } : { display_order: 1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('category', 'name_en name_bn')
            .lean();

        const total = await Service.countDocuments(filter);

        res.json({
            services,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
        });
    } catch (err) {
        console.error('getServices error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getServiceDetails(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findOne({ _id: req.params.id, is_active: true })
            .populate('category', 'name_en name_bn')
            .lean();

        if (!service) {
            res.status(404).json({ message: 'Service not found or inactive' });
            return;
        }

        res.json({ service });
    } catch (err) {
        console.error('getServiceDetails error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

// Compatibility alias: existing callers may still import getServiceBySlug.
export async function getServiceBySlug(req: Request, res: Response): Promise<void> {
    await getServiceDetails(req, res);
}

/* ═══════════════════════════════
   ADMIN APIS
   ═══════════════════════════════ */

export async function adminGetServices(req: Request, res: Response): Promise<void> {
    try {
        const { is_active, category, page = '1', limit = '50' } = req.query;
        const parsedPage = parseInt(String(page), 10);
        const parsedLimit = parseInt(String(limit), 10);
        const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;

        const filter: any = {};
        if (is_active !== undefined) filter.is_active = is_active === 'true';
        if (category && category !== 'all') filter.category = category;

        const rawServices = await Service.find(filter)
            .sort({ display_order: 1, createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

        const categoryIds = Array.from(
            new Set(
                rawServices
                    .map((service: any) => {
                        const categoryValue = service?.category;
                        if (!categoryValue) return '';
                        if (typeof categoryValue === 'string') return categoryValue;
                        if (typeof categoryValue === 'object' && categoryValue._id) return String(categoryValue._id);
                        return String(categoryValue);
                    })
                    .filter((id: string) => /^[a-f0-9]{24}$/i.test(id))
            )
        );

        const categories = categoryIds.length
            ? await ServiceCategory.find({ _id: { $in: categoryIds } })
                .select('name_en name_bn')
                .lean()
            : [];

        const categoryMap = new Map<string, { name_en?: string; name_bn?: string }>(
            categories.map((item: any) => [String(item._id), { name_en: item.name_en, name_bn: item.name_bn }])
        );

        const services = rawServices.map((service: any) => {
            const categoryValue = service?.category;
            const categoryId = categoryValue
                ? (typeof categoryValue === 'string'
                    ? categoryValue
                    : typeof categoryValue === 'object' && categoryValue._id
                        ? String(categoryValue._id)
                        : String(categoryValue))
                : '';
            const mappedCategory = categoryId ? categoryMap.get(categoryId) : undefined;

            return {
                ...service,
                category: mappedCategory
                    ? { _id: categoryId, ...mappedCategory }
                    : (categoryValue && typeof categoryValue === 'object' && 'name_en' in categoryValue
                        ? categoryValue
                        : null),
            };
        });

        const total = await Service.countDocuments(filter);
        res.json({ services, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } catch (err) {
        console.error('adminGetServices error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreateService(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body;
        // Basic validation
        if (!data.title_bn || !data.title_en) {
            res.status(400).json({ message: 'Both English and Bangla titles are required' });
            return;
        }

        const service = await Service.create(data);

        res.status(201).json({ service, message: 'Service created successfully' });
    } catch (err) {
        console.error('adminCreateService err', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdateService(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body;

        const service = await Service.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!service) { res.status(404).json({ message: 'Service not found' }); return; }

        res.json({ service, message: 'Service updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeleteService(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) { res.status(404).json({ message: 'Service not found' }); return; }

        res.json({ message: 'Service deleted permanently' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminReorderServices(req: Request, res: Response): Promise<void> {
    try {
        const { ids_in_order } = req.body;
        if (!Array.isArray(ids_in_order)) { res.status(400).json({ message: 'Invalid data format' }); return; }

        const bulkOps = ids_in_order.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { display_order: index } }
            }
        }));

        await Service.bulkWrite(bulkOps);
        res.json({ message: 'Services reordered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminToggleServiceStatus(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) { res.status(404).json({ message: 'Service not found' }); return; }

        service.is_active = !service.is_active;
        await service.save();

        res.json({ service, message: `Service is now ${service.is_active ? 'Active' : 'Inactive'}` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminToggleServiceFeatured(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) { res.status(404).json({ message: 'Service not found' }); return; }

        service.is_featured = !service.is_featured;
        await service.save();

        res.json({ service, message: `Service is ${service.is_featured ? 'now Featured' : 'no longer Featured'}` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetAuditLogs(req: Request, res: Response): Promise<void> {
    try {
        const serviceId = String(req.params.id || '').trim();
        if (!serviceId) {
            res.status(400).json({ message: 'Service id is required' });
            return;
        }

        const logs = await ServiceAuditLog.find({ service_id: serviceId })
            .populate('actor_id', 'full_name email')
            .sort({ timestamp: -1 })
            .lean();

        res.json({ logs });
    } catch (err) {
        console.error('adminGetAuditLogs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetPricingPlans(req: Request, res: Response): Promise<void> {
    try {
        const serviceId = String(req.params.id || '').trim();
        if (!serviceId) {
            res.status(400).json({ message: 'Service id is required' });
            return;
        }

        const plans = await ServicePricingPlan.find({ service_id: serviceId })
            .sort({ order_index: 1, createdAt: -1 })
            .lean();

        res.json({ plans });
    } catch (err) {
        console.error('adminGetPricingPlans error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreatePricingPlan(req: Request, res: Response): Promise<void> {
    try {
        const serviceId = String(req.params.id || '').trim();
        if (!serviceId) {
            res.status(400).json({ message: 'Service id is required' });
            return;
        }

        const payload = {
            ...req.body,
            service_id: serviceId,
        };

        if (!payload.name) {
            res.status(400).json({ message: 'Plan name is required' });
            return;
        }

        const plan = await ServicePricingPlan.create(payload);
        res.status(201).json({ plan, message: 'Pricing plan created successfully' });
    } catch (err) {
        console.error('adminCreatePricingPlan error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdatePricingPlan(req: Request, res: Response): Promise<void> {
    try {
        const serviceId = String(req.params.id || '').trim();
        const planId = String(req.params.planId || '').trim();
        if (!serviceId || !planId) {
            res.status(400).json({ message: 'Service id and plan id are required' });
            return;
        }

        const plan = await ServicePricingPlan.findOneAndUpdate(
            { _id: planId, service_id: serviceId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            res.status(404).json({ message: 'Pricing plan not found' });
            return;
        }

        res.json({ plan, message: 'Pricing plan updated successfully' });
    } catch (err) {
        console.error('adminUpdatePricingPlan error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeletePricingPlan(req: Request, res: Response): Promise<void> {
    try {
        const serviceId = String(req.params.id || '').trim();
        const planId = String(req.params.planId || '').trim();
        if (!serviceId || !planId) {
            res.status(400).json({ message: 'Service id and plan id are required' });
            return;
        }

        const plan = await ServicePricingPlan.findOneAndDelete({ _id: planId, service_id: serviceId });
        if (!plan) {
            res.status(404).json({ message: 'Pricing plan not found' });
            return;
        }

        res.json({ message: 'Pricing plan deleted successfully' });
    } catch (err) {
        console.error('adminDeletePricingPlan error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
