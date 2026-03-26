# Analytics Schema

Collection: `event_logs`

## Document Shape
- `userId: ObjectId | null`
- `sessionId: string`
- `eventName: string`
- `module: string`
- `meta: object`
- `source: "public" | "student" | "admin"`
- `ipAddress: string`
- `userAgent: string`
- `createdAt: Date`
- `updatedAt: Date`

## Indexes
- `{ eventName: 1, createdAt: -1 }`
- `{ module: 1, createdAt: -1 }`
- `{ userId: 1, createdAt: -1 }`
- `{ createdAt: -1 }`

## Tracked Events
- `university_apply_click`
- `university_official_click`
- `news_view`
- `news_share`
- `resource_download`
- `exam_viewed`
- `exam_started`
- `exam_submitted`
- `subscription_plan_view`
- `subscription_plan_click`
- `support_ticket_created`

## Privacy Controls
Configured via `settings.analyticsSettings`:
- `enabled`
- `trackAnonymous`
- `retentionDays`
- `eventToggles.*`
