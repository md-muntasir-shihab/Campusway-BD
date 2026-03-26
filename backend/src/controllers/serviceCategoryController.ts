import { Request, Response } from 'express';
import ServiceCategory from '../models/ServiceCategory';

export async function getCategories(req: Request, res: Response): Promise<void> {
    try {
        const categories = await ServiceCategory.find({ status: 'active' })
            .sort({ order_index: 1 })
            .select('-__v')
            .lean();
        res.json({ categories });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetCategories(req: Request, res: Response): Promise<void> {
    try {
        const categories = await ServiceCategory.find()
            .sort({ order_index: 1 })
            .select('-__v')
            .lean();
        res.json({ categories });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name_bn, name_en, status, order_index } = req.body;
        if (!name_bn || !name_en) { res.status(400).json({ message: 'Both English and Bangla names are required' }); return; }

        const category = await ServiceCategory.create({ name_bn, name_en, status, order_index });
        res.status(201).json({ category, message: 'Category created successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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
        if (!category) { res.status(404).json({ message: 'Category not found' }); return; }
        res.json({ category, message: 'Category updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeleteCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await ServiceCategory.findByIdAndDelete(req.params.id);
        if (!category) { res.status(404).json({ message: 'Category not found' }); return; }
        // TODO: We might want to remove this category from affected services, or prevent deletion if services exist.
        // For now, simple delete:
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}
