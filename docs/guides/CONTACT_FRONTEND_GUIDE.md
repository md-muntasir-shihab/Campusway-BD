# CampusWay Contact Frontend Guide

## Scope
- Frontend-only public route: `/contact`
- Stack: React + TypeScript + Tailwind + React Query + Framer Motion
- Backend/Admin are **not** implemented in this pass; page is contract-ready.

## Implemented Section Order
1. Contact Header
2. Quick Contact Cards (WhatsApp, Messenger, Call, Email)
3. Social Links Grid (built-in + custom links)
4. Contact Form (submit)
5. Support Tickets Preview CTA
6. Footer Note (terms/privacy short line)

## Backend Contracts (Frontend Ready)

### 1) Public settings
- `GET /api/settings/public`
- Used by `fetchPublicContactSettings()` in `frontend/src/api/contactApi.ts`
- Normalized into:
  - `siteName`
  - `logoUrl`
  - `siteDescription`
  - `contactLinks`
  - `footer.shortNote`

### 2) Contact message submit
- `POST /api/contact/messages`
- Used by `submitContactMessage()` in `frontend/src/api/contactApi.ts`
- Body:
  - `name`
  - `phone`
  - `email?`
  - `subject`
  - `message`
  - `preferredContact`
  - `consent`
- Response:
  - `{ ok: true, ticketId?: string }`

## Mock Mode
- Env flag: `VITE_USE_MOCK_API=true`
- Behavior:
  - Settings come from `frontend/src/mocks/contactMock.ts`
  - Submit is simulated with delay and returns mock `ticketId`

## React Query Setup
- Hook file: `frontend/src/hooks/useContactQueries.ts`
- Keys:
  - `contactKeys.publicSettings()`
  - `contactKeys.submitMessage()`
- Query:
  - `usePublicContactSettings()`
- Mutation:
  - `useSubmitContactMessage()`
  - Invalidates `publicSettings` on success

## Validation and UX
- Required:
  - Full Name, Phone, Subject, Message (min 20 chars), Consent
- Optional:
  - Email (validated only when provided)
- Preferred contact:
  - `whatsapp | phone | email | messenger`
- States:
  - Inline validation errors
  - Submit disabled while pending
  - Success toast + in-card success panel with optional `ticketId`
  - Error toast on failure

## Admin-Controlled Data (Later)
When backend/admin are connected, admin can control:
- Phone, email, address
- WhatsApp/Messenger/Facebook/Telegram/Instagram links
- Custom social links (`name`, `iconUrl`, `url`, `enabled`)
- Footer short note

