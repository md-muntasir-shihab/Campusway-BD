import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CalculatorService, CalculatorSettings, GradingConfig } from '../../services/calculatorApi';
import { Loader2, Calculator as CalcIcon, GraduationCap, School, BookOpen, RefreshCw, AlertTriangle, Wrench, ArrowLeft } from 'lucide-react';
import CGPACalculator from './components/CGPACalculator';
import SSCHSCCalculator from './components/SSCHSCCalculator';
import OLevelCalculator from './components/OLevelCalculator';
import SEO from '../../components/common/SEO';

export default function CalculatorHub() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<CalculatorSettings | null>(null);
    const [grading, setGrading] = useState<GradingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const activeTab = searchParams.get('tab') || 'cgpa';

    // Settings are required; grading is best-effort — calculators fall back to
    // hardcoded defaults when grading is missing, so a grading fetch failure
    // must NOT block the page (only a settings failure should).
    const loadSettings = useCallback(() => {
        setLoading(true);
        setLoadError(false);
        Promise.all([
            CalculatorService.getSettings(),
            CalculatorService.getGrading().catch((err) => {
                console.warn('Grading tables unavailable, using defaults:', err);
                return null;
            }),
        ])
            .then(([settingsData, gradingData]) => {
                setSettings(settingsData);
                setGrading(gradingData);
            })
            .catch((err) => {
                console.error('Failed to load calculator settings:', err);
                setLoadError(true);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Network/API failure is distinct from an intentional maintenance window.
    if (loadError || !settings) {
        return (
            <div className="flex flex-col justify-center items-center py-32 text-center px-4">
                <AlertTriangle className="h-16 w-16 text-amber-400 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Couldn't Load Calculators</h1>
                <p className="text-slate-500 max-w-md mb-6">
                    We couldn't reach the calculator service. Please check your connection and try again.
                </p>
                <button
                    onClick={loadSettings}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </button>
            </div>
        );
    }

    if (settings.maintenanceMode) {
        return (
            <div className="flex flex-col justify-center items-center py-32 text-center px-4">
                <Wrench className="h-16 w-16 text-slate-300 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Calculators Under Maintenance</h1>
                <p className="text-slate-500 max-w-md">Our calculators are currently undergoing maintenance. Please check back later.</p>
            </div>
        );
    }

    const tabs = [
        { id: 'cgpa', label: 'University CGPA', icon: GraduationCap, enabled: settings.isCGPAEnabled },
        { id: 'ssc', label: 'SSC GPA', icon: School, enabled: settings.isSSCEnabled },
        { id: 'hsc', label: 'HSC GPA', icon: School, enabled: settings.isHSCEnabled },
        { id: 'olevel', label: 'O/A Level', icon: BookOpen, enabled: settings.isOLevelEnabled },
    ].filter(t => t.enabled);

    // If active tab is disabled, default to the first available one
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
        setSearchParams({ tab: tabs[0].id });
        return null;
    }

    return (
        <div className="relative py-10 overflow-hidden transition-colors duration-500">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-[30rem] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none -z-10" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-48 -left-24 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

            <SEO title="Academic Calculators" description="Calculate your SSC, HSC, O/A Level GPA and University CGPA accurately." />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Back button — keeps the user oriented inside the public layout */}
                <button
                    onClick={() => navigate(-1)}
                    className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-300 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    Back
                </button>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-primary/10 border border-slate-100 dark:border-slate-700/50">
                        <CalcIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        Academic Calculators
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400">
                        Calculate your GPA and CGPA instantly. Select a calculator below.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-8 sm:mb-10 justify-center">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })}
                                className={`group relative flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 overflow-hidden ${
                                    isActive
                                        ? 'text-white shadow-lg shadow-primary/25 scale-[1.02] ring-2 ring-primary/20 dark:ring-primary/40'
                                        : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/50 hover:shadow-md'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-500 transition-transform duration-500" />
                                )}
                                <tab.icon className={`relative z-10 h-4 w-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                <span className="relative z-10 truncate">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bg-white/70 dark:bg-[#131B2F]/80 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/40 p-4 sm:p-8 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500">
                    {/* key forces a re-mount + fade/slide animation on tab switch */}
                    <div key={activeTab} className="animate-slide-up">
                        {activeTab === 'cgpa' && <CGPACalculator publicTable={grading?.publicUniTable} privateTable={grading?.privateUniTable} />}
                        {activeTab === 'ssc' && <SSCHSCCalculator mode="ssc" table={grading?.bdBoardTable} />}
                        {activeTab === 'hsc' && <SSCHSCCalculator mode="hsc" table={grading?.bdBoardTable} />}
                        {activeTab === 'olevel' && <OLevelCalculator table={grading?.oaTable} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
