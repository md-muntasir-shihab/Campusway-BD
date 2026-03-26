export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; errorCode: string; message: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
