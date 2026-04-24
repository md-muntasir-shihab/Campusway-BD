/**
 * Shared TypeScript interfaces for all API request/response shapes.
 *
 * These types are the single source of truth consumed by both the backend
 * controllers and the frontend API layer. The frontend references them via
 * a TypeScript path alias (`@shared/*`).
 */

export * from './api';
export * from './auth';
export * from './exam';
export * from './payment';
