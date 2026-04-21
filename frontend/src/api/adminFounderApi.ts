import api from '../services/api';

export interface FounderEducation {
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear?: number;
    description?: string;
}

export interface FounderExperience {
    company: string;
    role: string;
    startYear: number;
    endYear?: number;
    description?: string;
    current?: boolean;
}

export interface FounderContactDetails {
    phones: string[];
    email: string;
    website: string;
}

export interface FounderProfile {
    _id?: string;
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
    contactDetails: FounderContactDetails;
    skills: string[];
    education: FounderEducation[];
    experience: FounderExperience[];
    createdAt?: string;
    updatedAt?: string;
}

export function getAdminFounder(): Promise<FounderProfile> {
    return api.get('/admin/founder').then((response) => response.data as FounderProfile);
}

export function updateAdminFounder(data: Omit<FounderProfile, '_id' | 'createdAt' | 'updatedAt'>): Promise<FounderProfile> {
    return api.put('/admin/founder', data).then((response) => response.data as FounderProfile);
}
