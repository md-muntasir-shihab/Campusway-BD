# CampusWay Database Recovery Procedure

This document describes how to restore the MongoDB database from a backup snapshot created by the CampusWay Backup Service.

## Prerequisites

- Node.js 18+ installed
- Access to the MongoDB instance (connection string)
- A backup JSON file from `backup-snapshots/` directory or downloaded via the admin panel

## Backup File Location

Automated backups are stored in the `backup-snapshots/` directory (or the path configured via `BACKUP_DIR` env var). Each file is named:

```
campusway-backup-full-<timestamp>.json
campusway-backup-incremental-<timestamp>.json
```

## Recovery Options

### Option 1: Restore via Admin API (Recommended)

The safest method — creates a pre-restore safety snapshot automatically.

1. **List available backups:**
   ```bash
   curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
     https://<backend-url>/api/<ADMIN_PATH>/backups
   ```

2. **Identify the backup ID** from the response (the `_id` field).

3. **Execute the restore** with confirmation token:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"confirmation": "RESTORE <BACKUP_ID>"}' \
     https://<backend-url>/api/<ADMIN_PATH>/backups/<BACKUP_ID>/restore
   ```

   The API will:
   - Create a pre-restore safety snapshot
   - Drop all existing data in a transaction
   - Insert the backup data
   - Log the restore action in the audit log

### Option 2: Manual Restore via mongosh

Use this when the backend server is unavailable.

1. **Locate the backup file:**
   ```bash
   ls -la backup-snapshots/
   # Pick the most recent completed backup
   ```

2. **Verify the backup integrity:**
   ```bash
   # Check file is valid JSON and has data
   node -e "
     const fs = require('fs');
     const backup = JSON.parse(fs.readFileSync('backup-snapshots/<FILENAME>', 'utf8'));
     console.log('Generated at:', backup.metadata.generatedAt);
     console.log('Type:', backup.metadata.type);
     console.log('Collections:', Object.keys(backup.metadata.collectionCounts));
     console.log('Counts:', backup.metadata.collectionCounts);
   "
   ```

3. **Export each collection from the backup JSON to separate files:**
   ```bash
   node -e "
     const fs = require('fs');
     const backup = JSON.parse(fs.readFileSync('backup-snapshots/<FILENAME>', 'utf8'));
     for (const [key, docs] of Object.entries(backup.data)) {
       const ndjson = docs.map(d => JSON.stringify(d)).join('\n');
       fs.writeFileSync('/tmp/restore-' + key + '.json', ndjson);
       console.log('Exported', key, ':', docs.length, 'documents');
     }
   "
   ```

4. **Import into MongoDB using mongoimport:**
   ```bash
   MONGO_URI="mongodb://localhost:27017/campusway"

   # Drop and re-import each collection
   mongoimport --uri="$MONGO_URI" --collection=users --drop --file=/tmp/restore-users.json
   mongoimport --uri="$MONGO_URI" --collection=studentprofiles --drop --file=/tmp/restore-studentProfiles.json
   mongoimport --uri="$MONGO_URI" --collection=subscriptionplans --drop --file=/tmp/restore-subscriptionPlans.json
   mongoimport --uri="$MONGO_URI" --collection=manualpayments --drop --file=/tmp/restore-manualPayments.json
   mongoimport --uri="$MONGO_URI" --collection=expenseentries --drop --file=/tmp/restore-expenses.json
   mongoimport --uri="$MONGO_URI" --collection=staffpayouts --drop --file=/tmp/restore-staffPayouts.json
   mongoimport --uri="$MONGO_URI" --collection=studentdueledgers --drop --file=/tmp/restore-dueLedgers.json
   mongoimport --uri="$MONGO_URI" --collection=supporttickets --drop --file=/tmp/restore-supportTickets.json
   mongoimport --uri="$MONGO_URI" --collection=announcementnotices --drop --file=/tmp/restore-notices.json
   ```

### Option 3: Restore via Node.js Script

For programmatic restore without the running server:

```bash
MONGODB_URI="mongodb://localhost:27017/campusway" \
BACKUP_FILE="backup-snapshots/<FILENAME>" \
node -e "
  const mongoose = require('mongoose');
  const fs = require('fs');

  (async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const backup = JSON.parse(fs.readFileSync(process.env.BACKUP_FILE, 'utf8'));
    const db = mongoose.connection.db;

    for (const [key, docs] of Object.entries(backup.data)) {
      if (!Array.isArray(docs) || docs.length === 0) continue;
      const collName = key.toLowerCase();
      await db.collection(collName).deleteMany({});
      await db.collection(collName).insertMany(docs);
      console.log('Restored', collName, ':', docs.length, 'documents');
    }

    await mongoose.disconnect();
    console.log('Restore complete.');
  })().catch(err => { console.error(err); process.exit(1); });
"
```

## Post-Restore Checklist

1. **Verify document counts** match the backup metadata:
   ```bash
   mongosh "$MONGO_URI" --eval "
     db.users.countDocuments();
     db.studentprofiles.countDocuments();
     db.subscriptionplans.countDocuments();
   "
   ```

2. **Restart the backend server** to clear any in-memory caches.

3. **Invalidate Redis cache** (if using Upstash Redis):
   ```bash
   # Via the admin API or by restarting with CACHE_ENABLED=false temporarily
   ```

4. **Test critical flows**: login, exam access, payment status.

5. **Review audit logs** to confirm the restore was recorded.

## Backup Retention Policy

The automated backup system retains:
- **7 daily** backups (most recent)
- **4 weekly** backups (one per ISO week, most recent)
- **3 monthly** backups (one per calendar month, most recent)

These defaults are configurable via environment variables:
- `BACKUP_RETENTION_DAILY` (default: 7)
- `BACKUP_RETENTION_WEEKLY` (default: 4)
- `BACKUP_RETENTION_MONTHLY` (default: 3)

Older backups are automatically deleted after each successful backup run.
