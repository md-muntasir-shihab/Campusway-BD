# University Module Workflow

## Public Flow (`/universities`)
1. Page loads category summaries from `GET /api/university-categories` using query key `["universityCategories"]`.
2. Default selected tab is:
   - `homeSettings.universityDashboard.defaultCategory` when valid.
   - otherwise first canonical category.
3. University list loads from `GET /api/universities` using query key:
   - `["universities", { category, clusterGroup, q, sort, page }]`.
4. Category is required by default (`showAllCategories=false`), so mixed “all universities” list is blocked unless explicitly enabled by admin.
5. Cluster filter is applied only inside active category.
6. Search and sort operate only within the selected category.
7. Grid layout is strict responsive:
   - `lg`: 3 columns
   - `md`: 2 columns
   - `sm`: 1 column

## Detail Flow (`/universities/:slug`)
1. Detail data loads from `GET /api/universities/:slug` with query key `["universityDetail", slug]`.
2. Canonical and legacy fields are both normalized in response mapping, so existing detail UI remains compatible.
3. CTA actions remain intact:
   - Apply button (`admissionUrl`)
   - Official website button (`websiteUrl`)

## Canonical Category Contract
Canonical labels/order are defined in:
- `backend/src/utils/universityCategories.ts`

Exact set:
1. Individual Admission
2. Science & Technology
3. GST (General/Public)
4. GST (Science & Technology)
5. Medical College
6. AGRI Cluster
7. Under Army
8. DCU
9. Specialized University
10. Affiliate College
11. Dental College
12. Nursing Colleges

Normalization behavior:
- Legacy aliases are normalized to canonical labels.
- Strict normalizer also handles prefixed/legacy text and coerces unknowns to canonical-safe defaults.

## Admin Universities Flow
Routes:
- `/admin/universities`
- `/admin/universities/import`
- `/admin/universities/export`
- `/admin/universities/:id/edit`

Route wiring:
- Frontend routes redirect to admin dashboard tab routes and remain auth-protected.
- No 404 on required paths.

Core actions:
1. List/filter/search/sort universities.
2. Bulk select and bulk operations:
   - soft/hard delete
   - bulk update cluster/category fields
3. Active toggle per row.
4. Export filtered dataset (`csv`/`xlsx`).

## Import Mapping Wizard Flow
API endpoints:
1. `POST /api/admin/universities/import` (or `/import/init`) with XLSX/CSV file.
2. `POST /api/admin/universities/import/:jobId/validate` with mapping/defaults.
3. `POST /api/admin/universities/import/:jobId/commit` with mode:
   - `create-only`
   - `update-existing`
4. `GET /api/admin/universities/import/:jobId/errors.csv` for failed rows.

Validation checks:
- Required fields
- Date parsing
- Duplicate detection:
  - in-file: `(name + shortForm)` and `admissionUrl`
  - in-db: `name + shortForm` or `admissionUrl/admissionWebsite`

Template:
- `GET /api/admin/universities/template.xlsx` (and CSV format via query).

## Export Flow
Endpoint:
- `GET /api/admin/universities/export?type=xlsx|csv&category=&clusterGroup=&activeOnly=`

Supported filters:
- category
- clusterGroup
- activeOnly
- selected IDs (when provided by UI)

Output:
- full canonical column set, CSV or XLSX.

## React Query Invalidation Map
Admin mutations invalidate:
1. `["universities"]`
2. `["universityCategories"]`
3. `["home"]`
4. `["home-settings"]` / `["home_settings"]` where home highlights are affected

## Compatibility and Migration
1. Canonical fields were added without destructive removal of legacy fields.
2. Backfill script:
   - `backend/src/scripts/migrate-university-canonical-v1.ts`
   - npm script: `npm run migrate:university-canonical-v1`
3. Legacy route aliases remain available while frontend is normalized.
