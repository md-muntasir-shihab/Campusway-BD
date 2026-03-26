# CampusWay Backup & Restore Guide

## 1. MongoDB Backup Strategy

### Daily Automated Backup (mongodump)

**Script** (`scripts/backup-mongo.sh`):

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/campusway/$(date +%Y-%m-%d_%H%M)"
MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/campusway}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

echo "[backup] Starting MongoDB backup to $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR" --gzip

echo "[backup] Backup complete: $BACKUP_DIR"

# Cleanup old backups
echo "[backup] Cleaning backups older than $RETENTION_DAYS days"
find /backups/campusway -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "[backup] Done"
```

### Cron Schedule

```bash
# Daily at 3:00 AM server time
0 3 * * * /path/to/scripts/backup-mongo.sh >> /var/log/campusway-backup.log 2>&1
```

### Retention Policy

| Tier | Retention |
| --- | --- |
| Daily | 14 days |
| Weekly (Sunday) | 30 days |
| Monthly (1st) | 90 days |

## 2. Restore Procedure

### Full Restore

```bash
mongorestore --uri="$MONGO_URI" --gzip --drop /backups/campusway/2026-03-01_0300/
```

### Partial Restore (single collection)

```bash
mongorestore --uri="$MONGO_URI" --gzip --drop \
  --nsInclude="campusway.users" \
  /backups/campusway/2026-03-01_0300/
```

### Restore Verification Checklist

After every restore:

1. `GET /api/health` → `{ db: "connected" }`
2. Admin login succeeds
3. Count records match backup (spot check 3 collections)
4. Latest news items visible on `/news`

## 3. Upload Storage Backup

If using local storage (`public/uploads/`):

```bash
rsync -avz --delete /app/public/uploads/ /backups/campusway-uploads/
```

If using S3/Firebase Storage, enable versioning on the bucket.

## 4. Disaster Recovery Plan

| Scenario | Action |
| --- | --- |
| DB corruption | Restore latest daily backup |
| Accidental deletion | Restore specific collection |
| Server failure | Deploy to new instance + restore backup |
| Ransomware | Restore from off-site backup (S3/GCS) |
