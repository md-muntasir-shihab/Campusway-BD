# RESPONSIVE_MATRIX

Date: March 2, 2026
Viewport set verified via smoke and responsive checks:
- Mobile: `360x740`
- Tablet: `768x1024`
- Desktop: `1440x900`

## Matrix (Pass/Fail)

| Area | Route | Mobile | Tablet | Desktop | Notes |
|---|---|---|---|---|---|
| Public Home | `/` | PASS | PASS | PASS | No critical breakage |
| Public Services | `/services` | PASS | PASS | PASS | Cards and content load |
| Public News | `/news` | PASS | PASS | PASS | News widgets/list render |
| Public Exams | `/exams` | PASS | PASS | PASS | Entry cards and links stable |
| Public Resources | `/resources` | PASS | PASS | PASS | List renders with no overflow |
| Public Contact | `/contact` | PASS | PASS | PASS | Form/blocks render |
| Student Login | `/student/login` | PASS | PASS | PASS | Form controls accessible |
| Student Dashboard | `/student/dashboard` | PASS | PASS | PASS | Core widgets load |
| Student Profile | `/student/profile` | PASS | PASS | PASS | Profile layout stable |
| Exam Runner | `/exam/take/:id` | PASS | PASS | PASS | Submit flow works, no fatal overflow |
| Exam Result | `/exam/result/:id` | PASS | PASS | PASS | Pending/published result views stable |
| Admin Dashboard | `/campusway-secure-admin` | PASS | PASS | PASS | Key tabs reachable |
| Admin News Console | `/admin/news` | PASS | PASS | PASS | Admin news UI loads |

## Additional Responsive Suite
`frontend/e2e/news-exam-responsive.spec.ts`
- `news/exams render healthy at mobile`: PASS
- `news/exams render healthy at tablet`: PASS
- `news/exams render healthy at desktop`: PASS

## Known Responsive Risks
- Very large data tables in admin can still feel dense on small devices; pagination/filter-first usage is recommended.