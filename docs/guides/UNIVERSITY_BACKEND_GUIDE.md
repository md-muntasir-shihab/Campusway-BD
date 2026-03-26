# University Backend Guide

## Overview

This guide provides an overview of the backend implementations serving the University domain on CampusWay. Built with Node.js, Express, and Mongoose, this service facilitates the canonicalized structure for accessing public university lists grouped by Categories and Cluster Groups.

## Core Dependencies

- Node.js + Express
- Mongoose (MongoDB ORM)
- `exceljs` (For bulk import/export)
- `slugify` (For canonical slug mapping)
- `multer` (Upload processing)

## Database Schema Highlights

**`src/models/University.ts`** encapsulates:

1. `name`, `shortForm`, `slug`.
2. `category` (Main structural pillar)
3. `clusterGroup` (Secondary pillar, e.g., 'A Unit', 'B Unit', etc.)
4. `seats` / `examDates` / `applicationWindows` mapped as discrete entries or string fields payload blocks depending on canonical vs raw input.
5. Nested items: `faqs`, `examCenters`, `notices`.

## Public Endpoints

1. `GET /api/university-categories`
   - *Behavior*: Returns an aggregated list of categories, highlighting their distinct clusters and counts. Ideal for building frontend dynamic tabs.
2. `GET /api/universities`
   - *Behavior*: List endpoint with query filtering (`category`, `clusterGroup`, `q` for search). Requires Category scope or returns `400 CATEGORY_REQUIRED` conditionally.
3. `GET /api/universities/:slug`
   - *Behavior*: Maps to a single University document based on its strict unique slug.

## Admin Endpoints Integration & Validation

1. `POST /api/admin/universities/import`
   - Drives the administrative Import Wizard flow. Validates incoming rows against duplicate entries comparing `(name + shortForm)` or matching `admissionUrl`.
2. `GET /api/admin/universities/export`
   - Extracts current filtered database outputs strictly mapping column structures to CSV/XLSX variants.
3. `/api/admin/universities/*` endpoints are protected by standard JWT and Permission guards ensuring only strictly authorized user tokens can edit canonical lists.

## Background Synchronization & Scripts

- `migrate-university-canonical-v1.ts`: A script designed to homogenize legacy and fragmented category lists directly onto the DB onto canonical boundaries to prevent broken app states.
