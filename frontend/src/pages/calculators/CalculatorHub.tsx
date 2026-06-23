import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalculatorService, CalculatorSettings } from '../../services/calculatorApi';
import { Loader2, Calculator as CalcIcon, GraduationCap, School, BookOpen } from 'lucide-react';
import CGPACalculator from './components/CGPACalculator';
import SSCHSCCalculator from './components/SSCHSCCalculator';
import OLevelCalculator from './components/OLevelCalculator';
import SEO from '../../components/common/SEO';

export default function CalculatorHub() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [settings, setSettings] = useState<CalculatorSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const activeTab = searchParams.get('tab') || 'cgpa';

    useEffect(() => {
        CalculatorService.getSettings()
            .then(setSettings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!settings || settings.maintenanceMode) {
        return (
            <div className="flex flex-col justify-center items-center h-[50vh] text-center px-4">
                <CalcIcon className="h-16 w-16 text-slate-300 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Calculators Unavailable</h1>
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
        <div className="bg-slate-50 min-h-screen py-10">
            <SEO title="Academic Calculators" description="Calculate your SSC, HSC, O/A Level GPA and University CGPA accurately." />
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Academic Calculators
                    </h1>
                    <p className="mt-3 max-w-2xl mx-auto text-lg text-slate-500">
                        Calculate your GPA and CGPA instantly. Select a calculator below.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSearchParams({ tab: tab.id })}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border'
                            }`}
                        >
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-4 sm:p-8 border border-slate-100">
                    {activeTab === 'cgpa' && <CGPACalculator />}
                    {activeTab === 'ssc' && <SSCHSCCalculator mode="ssc" />}
                    {activeTab === 'hsc' && <SSCHSCCalculator mode="hsc" />}
                    {activeTab === 'olevel' && <OLevelCalculator />}
                </div>
            </div>
        </div>
    );
}
