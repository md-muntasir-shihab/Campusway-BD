# API Contract - Subscription

## Public
### GET `/api/subscription-plans`
Response:
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "type": "free",
      "priceBDT": 0,
      "durationDays": 30,
      "bannerImageUrl": null,
      "shortDescription": "string",
      "features": ["string"],
      "enabled": true,
      "displayOrder": 1,
      "isFeatured": false,
      "contactCtaLabel": "Contact to Subscribe",
      "contactCtaUrl": "https://..."
    }
  ],
  "settings": {
    "pageTitle": "Subscription Plans",
    "pageSubtitle": "Choose a plan",
    "headerBannerUrl": null,
    "defaultPlanBannerUrl": null,
    "currencyLabel": "BDT",
    "showFeaturedFirst": true
  }
}
```

## Student
### GET `/api/subscriptions/me`
Response:
```json
{
  "status": "active",
  "planName": "Premium 90",
  "expiresAtUTC": "2026-05-01T00:00:00.000Z",
  "daysLeft": 25
}
```

Allowed `status` values:
- `active`
- `expired`
- `pending`
- `none`

## Admin
### Plans
- `GET /api/admin/subscription-plans`
- `POST /api/admin/subscription-plans`
- `GET /api/admin/subscription-plans/:id`
- `PUT /api/admin/subscription-plans/:id`
- `DELETE /api/admin/subscription-plans/:id`
- `PUT /api/admin/subscription-plans/reorder`
- `PUT /api/admin/subscription-plans/:id/toggle`
- `PUT /api/admin/subscription-plans/:id/toggle-featured`

### Settings
- `GET /api/admin/subscription-settings`
- `PUT /api/admin/subscription-settings`

### User Subscriptions
- `GET /api/admin/user-subscriptions`
- `POST /api/admin/user-subscriptions/create`
- `PUT /api/admin/user-subscriptions/:id/activate`
- `PUT /api/admin/user-subscriptions/:id/suspend`
- `PUT /api/admin/user-subscriptions/:id/expire`
- `GET /api/admin/user-subscriptions/export?type=csv|xlsx`
