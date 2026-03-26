# Firebase Integration Runbook

## Scope
Firebase is integrated as an optional layer (without replacing React + Node + Mongo):
- Hosting (frontend)
- Storage (media uploads via backend)
- Optional client bootstrap

## Backend Environment Variables
Set in backend `.env`:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`

## Frontend Public Environment Variables
Set in frontend `.env`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Upload Behavior
- If Firebase Admin SDK env vars are present, backend uploads media to Firebase Storage and returns public Google Storage URLs.
- If missing, backend falls back to local uploads (or S3 signed upload where configured).

## Security Notes
- Service account credentials are backend-only. Never expose them in frontend code.
- Keep payment-proof/private media behind backend authorization if enabling that workflow.
