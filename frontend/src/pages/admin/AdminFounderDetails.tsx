import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Save, Plus, Trash2, User, GraduationCap, Briefcase, Camera, MapPin, Phone, Mail, Sparkles } from 'lucide-react';
import AdminGuardShell from '../../components/admin/AdminGuardShell';
import AdminImageUploadField from '../../components/admin/AdminImageUploadField';
import {
    getAdminFounder,
    updateAdminFounder,
    type FounderProfile,
    type FounderEducation,
    type FounderExperience,
} from '../../api/adminFounderApi';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const textareaClass = `${inputClass} min-h-[80px]`;
const labelClass = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300';

type FounderForm = {
    name: string;
    tagline: string;
    founderMessage: string;
    photoUrl: string;
    role: string;
    aboutText: string;
    fatherName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    location: string;
    phones: string[];
    email: string;
    website: string;
    skills: string[];
    education: FounderEducation[];
    experience: FounderExperience[];
};

const emptyForm: FounderForm = {
    name: '',
    tagline: '',
    founderMessage: '',
    photoUrl: '',
    role: '',
    aboutText: '',
    fatherName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    location: '',
    phones: [],
    email: '',
    website: '',
    skills: [],
    education: [],
    experience: [],
};

function profileToForm(profile: FounderProfile): FounderForm {
    return {
        name: profile.name || '',
        tagline: profile.tagline || '',
        founderMessage: profile.founderMessage || '',
        photoUrl: profile.photoUrl || '',
        role: profile.role || '',
        aboutText: profile.aboutText || '',
        fatherName: profile.fatherName || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        address: profile.address || '',
        location: profile.location || '',
        phones: profile.contactDetails?.phones || [],
        email: profile.contactDetails?.email || '',
        website: profile.contactDetails?.website || '',
        skills: profile.skills || [],
        education: profile.education || [],
        experience: profile.experience || [],
    };
}

export default function AdminFounderDetails() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FounderForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    const founderQuery = useQuery({
        queryKey: ['admin-founder'],
        queryFn: getAdminFounder,
        retry: false,
    });

    useEffect(() => {
        if (founderQuery.data) {
            setForm(profileToForm(founderQuery.data));
        }
    }, [founderQuery.data]);

    function updateField<K extends keyof FounderForm>(key: K, value: FounderForm[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    // --- Phone helpers ---
    function addPhone() {
        updateField('phones', [...form.phones, '']);
    }
    function removePhone(index: number) {
        updateField('phones', form.phones.filter((_, i) => i !== index));
    }
    function updatePhone(index: number, value: string) {
        const updated = [...form.phones];
        updated[index] = value;
        updateField('phones', updated);
    }

    // --- Skills helpers ---
    function addSkill() {
        updateField('skills', [...form.skills, '']);
    }
    function removeSkill(index: number) {
        updateField('skills', form.skills.filter((_, i) => i !== index));
    }
    function updateSkill(index: number, value: string) {
        const updated = [...form.skills];
        updated[index] = value;
        updateField('skills', updated);
    }

    // --- Education helpers ---
    function addEducation() {
        updateField('education', [...form.education, { institution: '', degree: '', field: '', startYear: new Date().getFullYear() }]);
    }
    function removeEducation(index: number) {
        updateField('education', form.education.filter((_, i) => i !== index));
    }
    function updateEducation(index: number, key: keyof FounderEducation, value: string | number) {
        const updated = [...form.education];
        updated[index] = { ...updated[index], [key]: value };
        updateField('education', updated);
    }

    // --- Experience helpers ---
    function addExperience() {
        updateField('experience', [...form.experience, { company: '', role: '', startYear: new Date().getFullYear(), current: false }]);
    }
    function removeExperience(index: number) {
        updateField('experience', form.experience.filter((_, i) => i !== index));
    }
    function updateExperience(index: number, key: keyof FounderExperience, value: string | number | boolean) {
        const updated = [...form.experience];
        updated[index] = { ...updated[index], [key]: value };
        updateField('experience', updated);
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            await updateAdminFounder({
                name: form.name.trim(),
                tagline: form.tagline.trim(),
                founderMessage: form.founderMessage.trim(),
                photoUrl: form.photoUrl.trim(),
                role: form.role.trim(),
                aboutText: form.aboutText.trim(),
                fatherName: form.fatherName.trim(),
                dateOfBirth: form.dateOfBirth.trim(),
                gender: form.gender.trim(),
                address: form.address.trim(),
                location: form.location.trim(),
                contactDetails: {
                    phones: form.phones.filter((p) => p.trim()),
                    email: form.email.trim(),
                    website: form.website.trim(),
                },
                skills: form.skills.filter((s) => s.trim()),
                education: form.education.filter((e) => e.institution.trim()),
                experience: form.experience.filter((e) => e.company.trim()),
            });
            toast.success('Founder details saved');
            await queryClient.invalidateQueries({ queryKey: ['admin-founder'] });
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to save founder details');
        } finally {
            setSaving(false);
        }
    }

    return (
        <AdminGuardShell title="Founder Details" description="Footer-এর Founder প্যানেলে প্রদর্শিত প্রোফাইল তথ্য ম্যানেজ করুন।">
            <div className="space-y-6 max-w-4xl">
                {founderQuery.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading founder details...
                    </div>
                )}

                {/* ── Photo & Identity ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ছবি ও পরিচয়</h2>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                            <AdminImageUploadField
                                label="Founder Photo"
                                value={form.photoUrl}
                                onChange={(nextUrl) => updateField('photoUrl', nextUrl)}
                                helper="বর্গাকার ছবি সর্বোত্তম।"
                                category="admin_upload"
                                previewAlt="Founder photo"
                                previewClassName="min-h-[160px]"
                            />
                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>Name *</label>
                                        <input aria-label="Founder name" className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Role</label>
                                        <input aria-label="Founder role" className={inputClass} placeholder="e.g. Founder & CEO" value={form.role} onChange={(e) => updateField('role', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Tagline</label>
                                    <input aria-label="Tagline" className={inputClass} placeholder="A short tagline or motto" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>About</label>
                                    <textarea aria-label="About text" className={textareaClass} placeholder="Brief biography" value={form.aboutText} onChange={(e) => updateField('aboutText', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── বাণী ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">প্রতিষ্ঠাতার বাণী</h2>
                        </div>
                    </div>
                    <div className="p-5">
                        <textarea aria-label="Founder message" className={`${textareaClass} min-h-[180px]`} placeholder="প্রিয় শিক্ষার্থী, ..." value={form.founderMessage} onChange={(e) => updateField('founderMessage', e.target.value)} />
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">এই বাণী Footer-এর Founder প্যানেলে দেখাবে।</p>
                    </div>
                </section>

                {/* ── ব্যক্তিগত তথ্য ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-emerald-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ব্যক্তিগত তথ্য</h2>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>জন্ম তারিখ</label>
                                <input aria-label="Date of birth" className={inputClass} placeholder="e.g. ১২ অক্টোবর ২০০৫" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>লিঙ্গ</label>
                                <input aria-label="Gender" className={inputClass} placeholder="e.g. পুরুষ" value={form.gender} onChange={(e) => updateField('gender', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>পিতার নাম (ঐচ্ছিক)</label>
                                <input aria-label="Father name" className={inputClass} placeholder="পিতার নাম" value={form.fatherName} onChange={(e) => updateField('fatherName', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Location</label>
                                <input aria-label="Location" className={inputClass} placeholder="City, Country" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>স্থায়ী ঠিকানা</label>
                                <textarea aria-label="Address" className={inputClass} placeholder="Full address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── যোগাযোগ ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-blue-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">যোগাযোগ</h2>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Email</label>
                                <input aria-label="Email" className={inputClass} placeholder="email@example.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Website</label>
                                <input aria-label="Website" className={inputClass} placeholder="https://example.com" value={form.website} onChange={(e) => updateField('website', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className={labelClass}>Phone Numbers</label>
                                <button type="button" onClick={addPhone} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                                    <Plus className="h-3 w-3" /> Add Phone
                                </button>
                            </div>
                            {form.phones.length === 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No phone numbers added.</p>
                            )}
                            <div className="space-y-2">
                                {form.phones.map((phone, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            aria-label={`Phone number ${index + 1}`}
                                            className={inputClass}
                                            placeholder="+880 1234 567890"
                                            value={phone}
                                            onChange={(e) => updatePhone(index, e.target.value)}
                                        />
                                        <button type="button" onClick={() => removePhone(index)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── দক্ষতা ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">দক্ষতা</h2>
                        </div>
                        <button type="button" onClick={addSkill} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Plus className="h-3 w-3" /> Add
                        </button>
                    </div>
                    <div className="p-5 space-y-2">
                        {
                            form.skills.length === 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No skills added.</p>
                            )
                        }
                        <div className="space-y-2">
                            {form.skills.map((skill, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        aria-label={`Skill ${index + 1}`}
                                        className={inputClass}
                                        placeholder="e.g. Graphic Design"
                                        value={skill}
                                        onChange={(e) => updateSkill(index, e.target.value)}
                                    />
                                    <button type="button" onClick={() => removeSkill(index)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── শিক্ষাগত যোগ্যতা ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">শিক্ষাগত যোগ্যতা</h2>
                        </div>
                        <button type="button" onClick={addEducation} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Plus className="h-3 w-3" /> Add
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        {
                            form.education.length === 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No education entries added.</p>
                            )
                        }
                        <div className="space-y-4">
                            {form.education.map((edu, index) => (
                                <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Entry {index + 1}</span>
                                        <button type="button" onClick={() => removeEducation(index)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>Institution *</label>
                                            <input
                                                aria-label={`Education ${index + 1} institution`}
                                                className={inputClass}
                                                placeholder="Institution name"
                                                value={edu.institution}
                                                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Degree</label>
                                            <input
                                                aria-label={`Education ${index + 1} degree`}
                                                className={inputClass}
                                                placeholder="e.g. BSc, GPA-5"
                                                value={edu.degree}
                                                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Field</label>
                                            <input
                                                aria-label={`Education ${index + 1} field`}
                                                className={inputClass}
                                                placeholder="e.g. Computer Science"
                                                value={edu.field}
                                                onChange={(e) => updateEducation(index, 'field', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelClass}>Start Year *</label>
                                                <input
                                                    aria-label={`Education ${index + 1} start year`}
                                                    type="number"
                                                    className={inputClass}
                                                    placeholder="2020"
                                                    value={edu.startYear || ''}
                                                    onChange={(e) => updateEducation(index, 'startYear', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>End Year</label>
                                                <input
                                                    aria-label={`Education ${index + 1} end year`}
                                                    type="number"
                                                    className={inputClass}
                                                    placeholder="2024"
                                                    value={edu.endYear || ''}
                                                    onChange={(e) => updateEducation(index, 'endYear', e.target.value ? parseInt(e.target.value) : undefined as any)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className={labelClass}>Description</label>
                                        <input
                                            aria-label={`Education ${index + 1} description`}
                                            className={inputClass}
                                            placeholder="Optional description"
                                            value={edu.description || ''}
                                            onChange={(e) => updateEducation(index, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── অভিজ্ঞতা ── */}
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-cyan-500" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">অভিজ্ঞতা</h2>
                        </div>
                        <button type="button" onClick={addExperience} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Plus className="h-3 w-3" /> Add
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        {
                            form.experience.length === 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No experience entries added.</p>
                            )
                        }
                        <div className="space-y-4">
                            {form.experience.map((exp, index) => (
                                <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Entry {index + 1}</span>
                                        <button type="button" onClick={() => removeExperience(index)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>Company *</label>
                                            <input
                                                aria-label={`Experience ${index + 1} company`}
                                                className={inputClass}
                                                placeholder="Company name"
                                                value={exp.company}
                                                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Role</label>
                                            <input
                                                aria-label={`Experience ${index + 1} role`}
                                                className={inputClass}
                                                placeholder="Job title"
                                                value={exp.role}
                                                onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelClass}>Start Year *</label>
                                                <input
                                                    aria-label={`Experience ${index + 1} start year`}
                                                    type="number"
                                                    className={inputClass}
                                                    placeholder="2020"
                                                    value={exp.startYear || ''}
                                                    onChange={(e) => updateExperience(index, 'startYear', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>End Year</label>
                                                <input
                                                    aria-label={`Experience ${index + 1} end year`}
                                                    type="number"
                                                    className={inputClass}
                                                    placeholder="2024"
                                                    value={exp.endYear || ''}
                                                    onChange={(e) => updateExperience(index, 'endYear', e.target.value ? parseInt(e.target.value) : undefined as any)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-5">
                                            <input
                                                type="checkbox"
                                                id={`exp-current-${index}`}
                                                checked={exp.current || false}
                                                onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`exp-current-${index}`} className="text-sm text-slate-700 dark:text-slate-300">Currently working here</label>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className={labelClass}>Description</label>
                                        <input
                                            aria-label={`Experience ${index + 1} description`}
                                            className={inputClass}
                                            placeholder="Optional description"
                                            value={exp.description || ''}
                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Founder Details
                    </button>
                </div>
            </div>
        </AdminGuardShell>
    );
}
