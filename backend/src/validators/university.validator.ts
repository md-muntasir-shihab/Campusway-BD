import { z } from 'zod';

const optionalDateString = z.string().nullable().optional();

// Exam centers accept either compact strings ("Dhaka - BUET Campus") or
// { city, address } objects; the controller's normalizeExamCenters() does the
// real normalization, so keep the schema permissive here.
const examCenterInput = z.union([z.string(), z.record(z.string(), z.unknown())]);

const clusterDateOverridesInput = z
    .object({
        applicationStartDate: optionalDateString,
        applicationEndDate: optionalDateString,
        scienceExamDate: z.string().optional(),
        artsExamDate: z.string().optional(),
        businessExamDate: z.string().optional(),
    })
    .partial()
    .nullable()
    .optional();

// Fields shared by create/update that the admin university form sends and the
// controller persists. Every field listed here MUST be declared — validateBody
// replaces req.body with the parsed output, and Zod strips undeclared keys,
// so a missing declaration means the field is silently dropped and the public
// details page never sees the update (this is how `description` got lost).
const sharedMutableFields = {
    description: z.string().optional(),
    establishedYear: z.coerce.number().nullable().optional(),
    isActive: z.boolean().optional(),
    featuredOrder: z.coerce.number().optional(),
    examCenters: z.array(examCenterInput).optional(),
    clusterDateOverrides: clusterDateOverridesInput,
    categorySyncLocked: z.boolean().optional(),
    clusterSyncLocked: z.boolean().optional(),
    unitLayout: z.enum(['compact', 'stacked', 'carousel']).optional(),
};

export const createUniversitySchema = z.object({
    name: z.string().trim().min(1, 'University name is required'),
    shortForm: z.string().trim().optional().default(''),
    slug: z.string().trim().optional().default(''),
    category: z.string().trim().optional().default('General'),
    clusterId: z.string().nullable().optional(),
    clusterGroup: z.string().nullable().optional(),
    contactNumber: z.string().optional().default(''),
    established: z.coerce.number().nullable().optional(),
    address: z.string().optional().default(''),
    email: z.string().optional().default(''),
    website: z.string().optional().default(''),
    admissionWebsite: z.string().optional().default(''),
    totalSeats: z.string().optional().default(''),
    scienceSeats: z.string().optional().default(''),
    artsSeats: z.string().optional().default(''),
    businessSeats: z.string().optional().default(''),
    applicationStartDate: optionalDateString,
    applicationStart: optionalDateString,
    applicationEndDate: optionalDateString,
    applicationEnd: optionalDateString,
    scienceExamDate: optionalDateString,
    examDateScience: optionalDateString,
    artsExamDate: optionalDateString,
    examDateArts: optionalDateString,
    businessExamDate: optionalDateString,
    examDateBusiness: optionalDateString,
    examCentersPreview: z.array(z.string()).optional().default([]),
    shortDescription: z.string().optional().default(''),
    logoUrl: z.string().optional().default(''),
    badgeText: z.string().optional().default(''),
    featured: z.boolean().optional().default(false),
    isHistorical: z.boolean().optional().default(false),
    endedAt: optionalDateString,
    ...sharedMutableFields,
}).refine(
    (data) => {
        const startStr = data.applicationStartDate || data.applicationStart;
        const endStr = data.applicationEndDate || data.applicationEnd;
        if (startStr && endStr) {
            const start = new Date(startStr);
            const end = new Date(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return end > start;
            }
        }
        return true;
    },
    {
        message: 'Application end date must be after start date',
        path: ['applicationEndDate'],
    }
);

export const updateUniversitySchema = z.object({
    name: z.string().trim().min(1).optional(),
    shortForm: z.string().trim().optional(),
    slug: z.string().trim().optional(),
    category: z.string().trim().optional(),
    clusterId: z.string().nullable().optional(),
    clusterGroup: z.string().nullable().optional(),
    contactNumber: z.string().optional(),
    established: z.coerce.number().nullable().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    admissionWebsite: z.string().optional(),
    totalSeats: z.string().optional(),
    scienceSeats: z.string().optional(),
    artsSeats: z.string().optional(),
    businessSeats: z.string().optional(),
    applicationStartDate: optionalDateString,
    applicationStart: optionalDateString,
    applicationEndDate: optionalDateString,
    applicationEnd: optionalDateString,
    scienceExamDate: optionalDateString,
    examDateScience: optionalDateString,
    artsExamDate: optionalDateString,
    examDateArts: optionalDateString,
    businessExamDate: optionalDateString,
    examDateBusiness: optionalDateString,
    examCentersPreview: z.array(z.string()).optional(),
    shortDescription: z.string().optional(),
    logoUrl: z.string().optional(),
    badgeText: z.string().optional(),
    featured: z.boolean().optional(),
    isHistorical: z.boolean().optional(),
    endedAt: optionalDateString,
    ...sharedMutableFields,
}).refine(
    (data) => {
        const startStr = data.applicationStartDate || data.applicationStart;
        const endStr = data.applicationEndDate || data.applicationEnd;
        if (startStr && endStr) {
            const start = new Date(startStr);
            const end = new Date(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return end > start;
            }
        }
        return true;
    },
    {
        message: 'Application end date must be after start date',
        path: ['applicationEndDate'],
    }
);
