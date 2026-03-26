export interface UniversityCategorySummary {
    categoryName: string;
    order: number;
    count: number;
    clusterGroups: string[];
}

export interface UniversityListQuery {
    category: string;
    clusterGroup?: string;
    q?: string;
    sort?: 'deadline' | 'alphabetical';
    page?: number;
    limit?: number;
}

export interface UniversitySeats {
    science?: number | null;
    arts?: number | null;
    commerce?: number | null;
}

export interface UniversitySeatsNA {
    science?: boolean;
    arts?: boolean;
    commerce?: boolean;
}

export interface ExamCenter {
    city: string;
    address?: string;
    mapUrl?: string;
}

export interface NextExam {
    department: string;
    date: string;
}

export interface UniversityContact {
    phone?: string;
    email?: string;
}

export interface UniversityLogo {
    url?: string;
    alt?: string;
}

export interface DefaultLogo {
    initials: string;
    color: string;
}

export interface SocialLink {
    platform: string;
    url: string;
    icon?: string;
}

export interface University {
    _id: string;
    name: string;
    shortForm: string;
    slug: string;
    category: string;
    clusterGroup?: string;
    description?: string;
    shortDescription?: string;
    established?: number;
    establishedYear?: number;
    totalSeats?: string;
    scienceSeats?: string;
    seatsScienceEng?: string;
    artsSeats?: string;
    seatsArtsHum?: string;
    businessSeats?: string;
    seatsBusiness?: string;
    applicationStart: string;
    applicationEnd: string;
    applicationStartDate?: string;
    applicationEndDate?: string;
    scienceExamDate?: string;
    examDateScience?: string;
    artsExamDate?: string;
    examDateArts?: string;
    businessExamDate?: string;
    examDateBusiness?: string;
    examCenters?: ExamCenter[];
    contact?: UniversityContact;
    website?: string;
    websiteUrl?: string;
    admissionWebsite?: string;
    admissionUrl?: string;
    logo?: UniversityLogo;
    defaultLogo?: DefaultLogo;
    featured?: boolean;
    featuredOrder?: number;
    isActive?: boolean;
    verificationStatus?: string;
    remarks?: string;
    address?: string;
    logoUrl?: string;
    socialLinks?: SocialLink[];
    units?: Array<{
        name: string;
        seats?: number;
        examDates?: string[];
        applicationStart?: string;
        applicationEnd?: string;
    }>;
    createdAt?: string;
    updatedAt: string;
}

export interface UniversityEntity extends University {}

export interface UniversityPaginatedResponse {
    universities: University[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface UniversityFilterParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    clusterGroup?: string;
    sort?: string;
    minSeats?: number;
    maxSeats?: number;
    featured?: boolean;
}
