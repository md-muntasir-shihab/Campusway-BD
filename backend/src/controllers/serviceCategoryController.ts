import { Request, Response } from 'express';
import ServiceCategory from '../models/ServiceCategory';
import { ResponseBuilder } from '../utils/responseBuilder';

export async function getCategories(req: Request, res: Response): Promise<void> {
    try {
        const categories = await ServiceCategory.find({ status: 'active' })
            .sort({ order_index: 1 })
            .select('-__v')
            .lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ categories }));
    } catch (err) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetCategories(req: Request, res: Response): Promise<void> {
    try {
        const categories = await ServiceCategory.find()
            .sort({ order_index: 1 })
            .select('-__v')
            .lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ categories }));
    } catch (err) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name_bn, name_en, status, order_index } = req.body;
        if (!name_bn || !name_en) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Both English and Bangla names are required')); return; }

        const category = await ServiceCategory.create({ name_bn, name_en, status, order_index });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({category}, 'Category created successfully'));
    } catch (err) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name_bn, name_en, status, order_index } = req.body;
        const category = await ServiceCategory.findByIdAndUpdate(
            req.params.id,
            { name_bn, name_en, status, order_index },
            { new: true, runValidators: true }
        );
        if (!category) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({category}, 'Category updated successfully'));
    } catch (err) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await ServiceCategory.findByIdAndDelete(req.params.id);
        if (!category) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
        // TODO: We might want to remove this category from affected services, or prevent deletion if services exist.
        // For now, simple delete:
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Category deleted successfully'));
    } catch (err) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
