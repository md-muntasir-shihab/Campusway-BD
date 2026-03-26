# CampusWay Next Hybrid Frontend

This app is the incremental Next.js migration target for:

- `/admin-dashboard`
- `/student`

It reuses the existing backend APIs (`Express + Mongo`) and does not break the current Vite frontend.

## Local run

1. Copy env:

```bash
cp .env.example .env.local
```

2. Install deps:

```bash
npm install
```

3. Start:

```bash
npm run dev
```

4. Open:

- `http://localhost:3000/admin-dashboard`
- `http://localhost:3000/student`

## Notes

- Uses `campusway-token` from browser localStorage for authenticated calls.
- API base can be changed via `NEXT_PUBLIC_API_BASE`.
- Admin path can be changed via `NEXT_PUBLIC_ADMIN_PATH`.
