import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import {
    Megaphone,
    Image as ImageIcon,
    BarChart3,
    Plus,
    Trash2,
    Edit3,
    DollarSign,
    Eye,
    MousePointer,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Calendar,
    ExternalLink,
} from 'lucide-react';

interface Campaign {
    _id: string;
    name: string;
    advertiserName: string;
    advertiserEmail?: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    budgetTotal: number;
    budgetSpent: number;
    pricingModel: 'CPM' | 'CPC' | 'FLAT';
    priceRate: number;
    startDate: string;
    endDate: string;
    createdAt: string;
}

interface Creative {
    _id: string;
    campaignId: string;
    placementSlug: string;
    variantName?: string;
    title: string;
    bodyText?: string;
    imageUrl?: string;
    targetUrl: string;
    callToAction?: string;
    sponsorName?: string;
    format: 'banner' | 'card' | 'native_card' | 'text_link' | 'modal_popup';
    status: 'draft' | 'active' | 'paused' | 'archived';
    impressionCount: number;
    clickCount: number;
    ctr: number;
}

interface RevenueStats {
    summary: {
        totalRevenue: number;
        totalImpressions: number;
        totalClicks: number;
        averageCtr: number;
    };
    placementBreakdown: Array<{
        placementSlug: string;
        impressions: number;
        clicks: number;
        ctr: number;
    }>;
}

export const AdManagementConsole: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'creatives' | 'revenue'>('campaigns');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [creatives, setCreatives] = useState<Creative[]>([]);
    const [stats, setStats] = useState<RevenueStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state for Campaign
    const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
    const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

    // Modal state for Creative
    const [showCreativeModal, setShowCreativeModal] = useState<boolean>(false);
    const [editingCreative, setEditingCreative] = useState<Partial<Creative> | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [campRes, creatRes, statRes] = await Promise.all([
                api.get<{ success: boolean; data: Campaign[] }>('/admin/ads/campaigns'),
                api.get<{ success: boolean; data: Creative[] }>('/admin/ads/creatives'),
                api.get<{ success: boolean; data: RevenueStats }>('/admin/ads/revenue-stats'),
            ]);

            if (campRes.data?.success) setCampaigns(campRes.data.data);
            if (creatRes.data?.success) setCreatives(creatRes.data.data);
            if (statRes.data?.success) setStats(statRes.data.data);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Failed to load ad management data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Campaign CRUD Actions
    const handleSaveCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCampaign) return;

        try {
            if (editingCampaign._id) {
                await api.put(`/admin/ads/campaigns/${editingCampaign._id}`, editingCampaign);
            } else {
                await api.post('/admin/ads/campaigns', editingCampaign);
            }
            setShowCampaignModal(false);
            setEditingCampaign(null);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.error?.message || 'Failed to save campaign');
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign? All associated creatives will be affected.')) return;
        try {
            await api.delete(`/admin/ads/campaigns/${id}`);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.error?.message || 'Failed to delete campaign');
        }
    };

    // Creative CRUD Actions
    const handleSaveCreative = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCreative) return;

        try {
            if (editingCreative._id) {
                await api.put(`/admin/ads/creatives/${editingCreative._id}`, editingCreative);
            } else {
                await api.post('/admin/ads/creatives', editingCreative);
            }
            setShowCreativeModal(false);
            setEditingCreative(null);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.error?.message || 'Failed to save creative');
        }
    };

    const handleDeleteCreative = async (id: string) => {
        if (!confirm('Are you sure you want to delete this ad creative?')) return;
        try {
            await api.delete(`/admin/ads/creatives/${id}`);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.error?.message || 'Failed to delete creative');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                        <Megaphone className="w-6 h-6 text-emerald-400" />
                        Native Ad & Monetization Console
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage advertising campaigns, native ad creative assets, targeting rules, and track monetization metrics.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'campaigns' && (
                        <button
                            onClick={() => {
                                setEditingCampaign({
                                    name: '',
                                    advertiserName: '',
                                    status: 'active',
                                    budgetTotal: 10000,
                                    pricingModel: 'CPC',
                                    priceRate: 5,
                                    startDate: new Date().toISOString().split('T')[0],
                                    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                                });
                                setShowCampaignModal(true);
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Campaign
                        </button>
                    )}

                    {activeTab === 'creatives' && (
                        <button
                            onClick={() => {
                                setEditingCreative({
                                    campaignId: campaigns[0]?._id || '',
                                    placementSlug: 'home_native_feed',
                                    title: '',
                                    targetUrl: '',
                                    format: 'card',
                                    status: 'active',
                                });
                                setShowCreativeModal(true);
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Creative
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 ${
                        activeTab === 'campaigns'
                            ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                >
                    <Megaphone className="w-4 h-4" />
                    Campaigns ({campaigns.length})
                </button>
                <button
                    onClick={() => setActiveTab('creatives')}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 ${
                        activeTab === 'creatives'
                            ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                >
                    <ImageIcon className="w-4 h-4" />
                    Ad Creatives ({creatives.length})
                </button>
                <button
                    onClick={() => setActiveTab('revenue')}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 ${
                        activeTab === 'revenue'
                            ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Revenue & Analytics
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
                    Loading Ad System Console...
                </div>
            ) : error ? (
                <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            ) : (
                <>
                    {/* CAMPAIGNS TAB */}
                    {activeTab === 'campaigns' && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="p-3">Campaign Name</th>
                                            <th className="p-3">Advertiser</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Pricing Model</th>
                                            <th className="p-3">Spent / Budget</th>
                                            <th className="p-3">Schedule</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {campaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-500">
                                                    No campaigns created yet. Click "New Campaign" to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            campaigns.map((c) => (
                                                <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-semibold text-slate-100">{c.name}</td>
                                                    <td className="p-3 text-slate-300">{c.advertiserName}</td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                                c.status === 'active'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                    : 'bg-slate-800 text-slate-400'
                                                            }`}
                                                        >
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-300">
                                                        {c.pricingModel} ({c.priceRate} BDT)
                                                    </td>
                                                    <td className="p-3 font-mono text-slate-300">
                                                        ৳{c.budgetSpent} / ৳{c.budgetTotal}
                                                    </td>
                                                    <td className="p-3 text-slate-400 text-[11px]">
                                                        {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCampaign(c);
                                                                setShowCampaignModal(true);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCampaign(c._id)}
                                                            className="p-1.5 rounded hover:bg-red-950 text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CREATIVES TAB */}
                    {activeTab === 'creatives' && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="p-3">Ad Title</th>
                                            <th className="p-3">Placement Slug</th>
                                            <th className="p-3">Format</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Impressions</th>
                                            <th className="p-3">Clicks</th>
                                            <th className="p-3">CTR</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {creatives.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-slate-500">
                                                    No ad creatives created yet. Click "New Creative" to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            creatives.map((cr) => (
                                                <tr key={cr._id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-semibold text-slate-100">
                                                        <div>{cr.title}</div>
                                                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                                            {cr.targetUrl}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 font-mono text-emerald-400">{cr.placementSlug}</td>
                                                    <td className="p-3 text-slate-300 uppercase text-[10px] font-bold">
                                                        {cr.format}
                                                    </td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                                cr.status === 'active'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                    : 'bg-slate-800 text-slate-400'
                                                            }`}
                                                        >
                                                            {cr.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-mono">{cr.impressionCount || 0}</td>
                                                    <td className="p-3 font-mono">{cr.clickCount || 0}</td>
                                                    <td className="p-3 font-mono text-emerald-400 font-bold">
                                                        {(cr.ctr || 0).toFixed(2)}%
                                                    </td>
                                                    <td className="p-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCreative(cr);
                                                                setShowCreativeModal(true);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCreative(cr._id)}
                                                            className="p-1.5 rounded hover:bg-red-950 text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* REVENUE & ANALYTICS TAB */}
                    {activeTab === 'revenue' && stats && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                                        <span>Total Est. Revenue</span>
                                        <DollarSign className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-100 font-mono">
                                        ৳{stats.summary.totalRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500">Based on CPM / CPC pricing models</div>
                                </div>

                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                                        <span>Total Impressions</span>
                                        <Eye className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-100 font-mono">
                                        {stats.summary.totalImpressions.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500">Verified native ad views</div>
                                </div>

                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                                        <span>Total Clicks</span>
                                        <MousePointer className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-100 font-mono">
                                        {stats.summary.totalClicks.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500">Direct user engagement</div>
                                </div>

                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                                        <span>Average CTR</span>
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div className="text-2xl font-black text-emerald-400 font-mono">
                                        {stats.summary.averageCtr.toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-slate-500">Click-through rate across placements</div>
                                </div>
                            </div>

                            {/* Placement Breakdown Table */}
                            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                                <h3 className="text-sm font-bold text-slate-200">Placement Performance Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-300">
                                        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="p-3">Placement Slug</th>
                                                <th className="p-3">Impressions</th>
                                                <th className="p-3">Clicks</th>
                                                <th className="p-3">CTR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {stats.placementBreakdown.map((pb) => (
                                                <tr key={pb.placementSlug} className="hover:bg-slate-800/30">
                                                    <td className="p-3 font-mono text-emerald-400">{pb.placementSlug}</td>
                                                    <td className="p-3 font-mono">{pb.impressions}</td>
                                                    <td className="p-3 font-mono">{pb.clicks}</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">
                                                        {pb.ctr.toFixed(2)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Campaign Modal */}
            {showCampaignModal && editingCampaign && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={handleSaveCampaign}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
                    >
                        <h3 className="text-base font-bold text-slate-100">
                            {editingCampaign._id ? 'Edit Campaign' : 'Create New Ad Campaign'}
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCampaign.name || ''}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Advertiser Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCampaign.advertiserName || ''}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, advertiserName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 mb-1">Pricing Model</label>
                                    <select
                                        value={editingCampaign.pricingModel || 'CPC'}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, pricingModel: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                    >
                                        <option value="CPC">CPC (Cost Per Click)</option>
                                        <option value="CPM">CPM (Cost Per Mille)</option>
                                        <option value="FLAT">FLAT (Fixed Rate)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Price Rate (BDT)</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingCampaign.priceRate || 0}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, priceRate: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 mb-1">Total Budget (BDT)</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingCampaign.budgetTotal || 0}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, budgetTotal: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Status</label>
                                    <select
                                        value={editingCampaign.status || 'active'}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, status: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowCampaignModal(false)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl hover:bg-emerald-400"
                            >
                                Save Campaign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Creative Modal */}
            {showCreativeModal && editingCreative && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={handleSaveCreative}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
                    >
                        <h3 className="text-base font-bold text-slate-100">
                            {editingCreative._id ? 'Edit Creative' : 'Create New Ad Creative'}
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Parent Campaign</label>
                                <select
                                    required
                                    value={editingCreative.campaignId || ''}
                                    onChange={(e) => setEditingCreative({ ...editingCreative, campaignId: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                >
                                    <option value="">Select Campaign...</option>
                                    {campaigns.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name} ({c.advertiserName})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Placement Slug</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. home_native_feed, university_sidebar"
                                    value={editingCreative.placementSlug || ''}
                                    onChange={(e) => setEditingCreative({ ...editingCreative, placementSlug: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Ad Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCreative.title || ''}
                                    onChange={(e) => setEditingCreative({ ...editingCreative, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Body Text / Copy</label>
                                <textarea
                                    rows={2}
                                    value={editingCreative.bodyText || ''}
                                    onChange={(e) => setEditingCreative({ ...editingCreative, bodyText: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 mb-1">Target URL</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://..."
                                        value={editingCreative.targetUrl || ''}
                                        onChange={(e) => setEditingCreative({ ...editingCreative, targetUrl: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Call to Action (CTA)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Learn More"
                                        value={editingCreative.callToAction || ''}
                                        onChange={(e) => setEditingCreative({ ...editingCreative, callToAction: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowCreativeModal(false)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl hover:bg-emerald-400"
                            >
                                Save Creative
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
