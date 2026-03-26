# University Frontend Guide

## Overview

This guide covers the implementation details for the Universities frontend module (`/universities` and `/universities/:slug`). The module is built using React, TypeScript, Tailwind CSS, React Query, and Framer Motion, following a strict mobile-first design and dark/light mode compatibility.

## Routing

- `/universities`: The Universities list page with category tabs and filters.
- `/universities/:slug`: The University detail page.

## Components & Architecture

1. **`Universities.tsx` (List Page)**
   - Uses `useQuery` for `universityCategories` and `universities`.
   - Category tabs are strictly required to drive the data fetching.
   - Features a sticky headers and category tabs for easy navigation.
   - Includes a filter bottom sheet for mobile users to access cluster group filters.
   - Uses a responsive grid (1 column on mobile, 2 on tablet, 3 on desktop) for rendering `UniversityCard` components.

2. **`UniversityCard`**
   - Renders individual university information including logo, name, required scores, seat count, application dates, and admission exam dates.
   - Includes Framer Motion animations for hover and layout transitions.

3. **`UniversityDetails.tsx` (Detail Page)**
   - Uses `useQuery` with `['universityDetail', slug]`.
   - Displays comprehensive information about a university, including about section, application windows, departments/seat distribution, exam centers, requirements, and FAQs.
   - Follows strict mobile-first UI with responsive layouts mapped from 360px width.

## Data Fetching (React Query)

- **Categories:**

  ```ts
  const { data: categoriesData } = useQuery({
      queryKey: ['universityCategories'],
      queryFn: async () => {
          const res = await api.get('/university-categories');
          return res.data;
      }
  });
  ```

- **Universities List:**

  ```ts
  const { data: universitiesData } = useQuery({
      queryKey: ['universities', { category: selectedCategory, clusterGroup: selectedFilter, q: searchQuery }],
      queryFn: async () => { ... }
  });
  ```

- **University Detail:**

  ```ts
  const { data: university } = useQuery({
      queryKey: ['universityDetail', slug],
      queryFn: async () => { ... }
  });
  ```

## Styling

- Strict usage of Tailwind CSS with prefix utility classes.
- Perfect dark/light mode consistency using `dark:` classes everywhere.
- No `!important` overriding; all spacing and typography follow the design tokens.

## Mock API & Backend Contract

- Data structures map perfectly to `ApiUniversity`, `ApiUnit`, `ApiExamCenter`, `ApiNotice`, and `ApiFaq` defined in `api.ts`.
- The frontend is backend-contract ready, seamlessly parsing data shapes aligned with standard REST interfaces.
