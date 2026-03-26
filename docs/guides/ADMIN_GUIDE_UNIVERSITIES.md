# Admin Guide: Universities

## Introduction

The Universities panel manages the core catalog of institutions accessible from the campus application. This guide outlines how administrators interact with the catalog.

## Location

Admin Dashboard > Universities (`/admin/universities`)

## Core Functionalities

### 1. View & Filter

The main interface lists active universities.

- **Filter by Category**: The catalog relies strictly on specific category naming conventions (e.g., "Science & Technology", "Medical College").
- **Search**: Search directly operates on `name` or `shortForm` aliases.
- **Toggle State**: Standard row switches operate to hard toggle `isActive` visibility state. Disabled universities won't show on `/universities`.

### 2. Manual Creation / Modification

Hitting `Add University` introduces an input modal with strictly formatted categories and cluster groupings. Essential fields include:

- Name + Short alias mapping.
- Address + Websites.
- Seats availability (Science, Arts, Business).
- Dates mapping for exam and application timelines.

### 3. Bulk Edit / Hard & Soft Deletion

Admins can select multiple items to trigger bulk updates over distinct fields (like turning all items from active to inactive simultaneously) or deleting chunks iteratively (soft delete standard operation over hard dataset nuking to safeguard reference parity).

### 4. Bulk Importing (Excel / CSV Wizard)

The system supports a 3-step import wizard:

1. **Upload**: Drop `.xlsx` or `.csv` referencing standard column formats (or export the `template.xlsx` from the backend to guarantee layout mapping).
2. **Review/Validate**: The engine checks the file pre-upload. Red validation alerts point to duplicates based on standard matching `admissionUrl` or combination logic on identical names.
3. **Commit**: Either `Update Existing` or `Create New` modes are allowed. A report with failed lines maps to `errors.csv` on exit.

### 5. Export Strategy

Clicking Export extracts the *current filter boundary*. If 50 properties fit the `Medical` category, exporting produces only those 50 lines. You can select `.csv` or `.xlsx` export modalities freely.
