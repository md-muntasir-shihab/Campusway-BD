import { useCallback, useState } from 'react';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Gift,
    Loader2,
    Package,
    ShoppingCart,
    Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    usePackages,
    usePurchasePackage,
} from '../../../hooks/useExamSystemQueries';
import type { ExamPackage, PaginationParams } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 12;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function formatPrice(amount: number): string {
    return `৳${amount.toLocaleString()}`;
}

function getDiscountedPrice(price: number, discountPct: number): number {
    return Math.round(price * (1 - discountPct / 100));
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function PackageCard({ pkg, onBuy, isBuying }: { pkg: ExamPackage; onBuy: (id: string) => void; isBuying: boolean }) {
    const hasDiscount = pkg.discountPercentage > 0;
    const finalPrice = hasDiscount ? getDiscountedPrice(pkg.priceBDT, pkg.discountPercentage) : pkg.priceBDT;
    const isFree = finalPrice === 0;
    const isExpired = new Date(pkg.validUntil) < new Date();

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
                {hasDiscount && (
                    <span className="absolute top-3 right-3 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">-{pkg.discountPercentage}%</span>
                )}
                <Package className="h-8 w-8 text-white/80 mb-3" />
                <h3 className="text-lg font-bold text-white leading-tight">{pkg.title}</h3>
                {pkg.title_bn && <p className="text-sm text-white/70 mt-0.5">{pkg.title_bn}</p>}
            </div>
            <div className="flex-1 p-5">
                {pkg.description && <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{pkg.description}</p>}
                <div className="flex items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" />{pkg.exams.length} exam{pkg.exams.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1.5"><ShoppingCart className="h-4 w-4" />{pkg.purchaseCount} sold</span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                    {isFree ? (
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(finalPrice)}</span>
                            {hasDiscount && <span className="text-sm text-slate-400 dark:text-slate-500 line-through">{formatPrice(pkg.priceBDT)}</span>}
                        </>
                    )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Valid until {new Date(pkg.validUntil).toLocaleDateString()}</p>
            </div>
            <div className="px-5 pb-5">
                <button
                    type="button"
                    onClick={() => onBuy(pkg._id)}
                    disabled={isBuying || isExpired}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors min-h-[44px] ${isExpired ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : isFree ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : isExpired ? 'Expired' : isFree ? <><Gift className="h-4 w-4" />Get Free</> : <><CreditCard className="h-4 w-4" />Buy Now</>}
                </button>
            </div>
        </div>
    );
}

function PurchaseDialog({ pkg, onConfirm, onCancel, isPurchasing }: { pkg: ExamPackage; onConfirm: (coupon?: string) => void; onCancel: () => void; isPurchasing: boolean }) {
    const [couponCode, setCouponCode] = useState('');
    const hasDiscount = pkg.discountPercentage > 0;
    const finalPrice = hasDiscount ? getDiscountedPrice(pkg.priceBDT, pkg.discountPercentage) : pkg.priceBDT;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Confirm Purchase</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    You are about to purchase <strong>{pkg.title}</strong> for <strong>{formatPrice(finalPrice)}</strong>.
                </p>
                <div className="mb-4">
                    <label htmlFor="coupon-code" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Coupon Code (optional)</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input id="coupon-code" type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} disabled={isPurchasing} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]">Cancel</button>
                    <button type="button" onClick={() => onConfirm(couponCode.trim() || undefined)} disabled={isPurchasing} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]">
                        {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {isPurchasing ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ExamPackageListing() {
    const [page, setPage] = useState(1);
    const [selectedPackage, setSelectedPackage] = useState<ExamPackage | null>(null);
    const params: PaginationParams = { page, limit: PAGE_SIZE };
    const { data, isLoading, isError } = usePackages(params);
    const purchaseMutation = usePurchasePackage();
    const packages = data?.data ?? [];
    const totalPages = data?.pagination?.totalPages ?? 1;

    const handleBuy = useCallback((packageId: string) => {
        const pkg = packages.find((p) => p._id === packageId);
        if (pkg) setSelectedPackage(pkg);
    }, [packages]);

    const handleConfirmPurchase = useCallback(async (couponCode?: string) => {
        if (!selectedPackage) return;
        try {
            await purchaseMutation.mutateAsync({ packageId: selectedPackage._id, couponCode });
            toast.success('Package purchased successfully!');
            setSelectedPackage(null);
        } catch {
            toast.error('Purchase failed. Please try again.');
        }
    }, [selectedPackage, purchaseMutation]);

    if (isLoading && packages.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <Package className="mx-auto h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load exam packages</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-5xl px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Package className="h-6 w-6 text-indigo-500" />
                        Exam Packages
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Browse and purchase exam bundles at discounted prices</p>
                </div>

                {packages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No packages available</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check back later for new exam packages</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packages.map((pkg) => (
                            <PackageCard key={pkg._id} pkg={pkg} onBuy={handleBuy} isBuying={purchaseMutation.isPending && selectedPackage?._id === pkg._id} />
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]" aria-label="Previous page">
                            <ChevronLeft className="h-4 w-4" />Prev
                        </button>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
                        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]" aria-label="Next page">
                            Next<ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {selectedPackage && (
                <PurchaseDialog pkg={selectedPackage} onConfirm={(c) => void handleConfirmPurchase(c)} onCancel={() => setSelectedPackage(null)} isPurchasing={purchaseMutation.isPending} />
            )}
        </div>
    );
}
