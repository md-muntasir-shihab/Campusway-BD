import api from '../services/api';
import type {
    ApiResponse,
    PaginatedResponse,
    ExamPackage,
    ExamPackageDto,
    PaginationParams,
} from '../types/exam-system';

const BASE = '/v1/exam-packages';

/** POST / — Create a new exam package (admin/examiner only). */
export const createPackage = (payload: ExamPackageDto) =>
    api.post<ApiResponse<ExamPackage>>(`${BASE}`, payload).then((r) => r.data);

/** GET / — List active exam packages. */
export const listPackages = (params?: PaginationParams) =>
    api.get<PaginatedResponse<ExamPackage>>(`${BASE}`, { params }).then((r) => r.data);

/** POST /:id/purchase — Purchase an exam package. */
export const purchasePackage = (packageId: string, couponCode?: string) =>
    api.post<ApiResponse<{ paymentId: string; amountPaid: number; examsGranted: string[] }>>(
        `${BASE}/${packageId}/purchase`,
        couponCode ? { couponCode } : undefined,
    ).then((r) => r.data);
