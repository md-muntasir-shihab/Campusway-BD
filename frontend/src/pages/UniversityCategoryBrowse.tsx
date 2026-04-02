import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import UniversityBrowseShell from '../components/university/UniversityBrowseShell';
import { useUniversityCategories } from '../hooks/useUniversityQueries';
import { toSlug } from '../lib/apiClient';

export default function UniversityCategoryBrowsePage() {
    const { categorySlug } = useParams<{ categorySlug: string }>();
    const { data: categories, isLoading } = useUniversityCategories();

    const match = useMemo(
        () => categories?.find((c) => c.categorySlug === categorySlug || c.categoryName === categorySlug || c.categorySlug === toSlug(String(categorySlug || ''))) ?? null,
        [categories, categorySlug],
    );

    const categoryName = match?.categoryName ?? '';
    const canonicalCategorySlug = match?.categorySlug || toSlug(categoryName || String(categorySlug || ''));

    if (isLoading) {
        return (
            <div className="section-container py-12 text-center">
                <p className="text-lg font-semibold text-text dark:text-dark-text">Loading category universities...</p>
            </div>
        );
    }

    if (!categoryName && categories?.length) {
        return (
            <div className="section-container py-12 text-center">
                <p className="text-lg font-semibold text-text dark:text-dark-text">Category not found</p>
                <p className="mt-1 text-sm text-text-muted dark:text-dark-text/70">
                    The category &ldquo;{categorySlug}&rdquo; does not exist.
                </p>
            </div>
        );
    }

    return (
        <UniversityBrowseShell
            fixedCategory={canonicalCategorySlug}
            title={categoryName || 'Category'}
            subtitle={`Showing all universities in ${categoryName || 'this category'}.`}
            hideCategoryTabs
            cardVariant="modern"
        />
    );
}
