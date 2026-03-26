import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { connectDB } from '../config/db';

type SnapshotAction = 'backup' | 'restore';

type SnapshotCollectionManifest = {
    name: string;
    file: string;
    documentCount: number;
    indexes: Array<Record<string, unknown>>;
    options: Record<string, unknown>;
};

type SnapshotManifest = {
    snapshotId: string;
    databaseName: string;
    generatedAt: string;
    uriFingerprint: string;
    collections: SnapshotCollectionManifest[];
};

function resolveSnapshotAction(): SnapshotAction {
    if (process.argv.includes('--restore')) return 'restore';
    const envAction = String(process.env.E2E_SNAPSHOT_ACTION || '').trim().toLowerCase();
    return envAction === 'restore' ? 'restore' : 'backup';
}

function resolveSnapshotRoot(): string {
    const envValue = String(process.env.E2E_SNAPSHOT_ROOT || '').trim();
    if (envValue) return path.resolve(envValue);
    return path.resolve(process.cwd(), '../qa-artifacts/db-snapshots');
}

function sanitizeFileSegment(value: string): string {
    return encodeURIComponent(String(value || '').trim() || 'unknown');
}

function createSnapshotId(): string {
    return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function pickIndexOptions(raw: Record<string, unknown>): Record<string, unknown> {
    const allowed = [
        'name',
        'unique',
        'sparse',
        'expireAfterSeconds',
        'partialFilterExpression',
        'collation',
        'weights',
        'default_language',
        'language_override',
        'textIndexVersion',
        '2dsphereIndexVersion',
        'bits',
        'min',
        'max',
        'bucketSize',
        'wildcardProjection',
        'hidden',
    ];

    const options: Record<string, unknown> = {};
    for (const key of allowed) {
        if (raw[key] !== undefined) options[key] = raw[key];
    }
    return options;
}

async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

async function backupSnapshot(snapshotRoot: string): Promise<Record<string, unknown>> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection is not ready.');

    const snapshotId = String(process.env.E2E_SNAPSHOT_ID || '').trim() || createSnapshotId();
    const snapshotDir = path.join(snapshotRoot, snapshotId);
    const collectionsDir = path.join(snapshotDir, 'collections');
    await ensureDir(collectionsDir);

    const list = await db.listCollections().toArray();
    const manifestCollections: SnapshotCollectionManifest[] = [];
    let totalDocuments = 0;

    for (const entry of list) {
        const name = String(entry.name || '').trim();
        if (!name || name.startsWith('system.')) continue;

        const collection = db.collection(name);
        const [documents, indexes] = await Promise.all([
            collection.find({}).toArray(),
            collection.indexes(),
        ]);

        const fileName = `${sanitizeFileSegment(name)}.ejson`;
        const filePath = path.join(collectionsDir, fileName);
        await fs.writeFile(filePath, EJSON.stringify(documents, { relaxed: false }), 'utf-8');

        const collectionOptions = ((entry as { options?: Record<string, unknown> }).options || {}) as Record<string, unknown>;

        manifestCollections.push({
            name,
            file: `collections/${fileName}`,
            documentCount: documents.length,
            indexes: indexes as unknown as Array<Record<string, unknown>>,
            options: collectionOptions,
        });
        totalDocuments += documents.length;
    }

    const uriRaw = String(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const manifest: SnapshotManifest = {
        snapshotId,
        databaseName: String(db.databaseName || ''),
        generatedAt: new Date().toISOString(),
        uriFingerprint: createHash('sha1').update(uriRaw).digest('hex'),
        collections: manifestCollections,
    };

    const manifestPath = path.join(snapshotDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return {
        ok: true,
        action: 'backup',
        snapshotId,
        snapshotRoot,
        snapshotDir,
        manifestPath,
        databaseName: manifest.databaseName,
        collectionCount: manifestCollections.length,
        totalDocuments,
    };
}

async function restoreSnapshot(snapshotRoot: string): Promise<Record<string, unknown>> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection is not ready.');

    const snapshotId = String(process.env.E2E_SNAPSHOT_ID || '').trim();
    if (!snapshotId) {
        throw new Error('E2E_SNAPSHOT_ID is required for restore.');
    }

    const snapshotDir = path.join(snapshotRoot, snapshotId);
    const manifestPath = path.join(snapshotDir, 'manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw) as SnapshotManifest;

    const existingCollections = await db.listCollections().toArray();
    for (const entry of existingCollections) {
        const name = String(entry.name || '').trim();
        if (!name || name.startsWith('system.')) continue;
        await db.dropCollection(name).catch(() => undefined);
    }

    let restoredCollections = 0;
    let restoredDocuments = 0;
    for (const collectionManifest of manifest.collections) {
        const collectionName = String(collectionManifest.name || '').trim();
        if (!collectionName) continue;

        await db.createCollection(collectionName).catch(() => undefined);
        const collection = db.collection(collectionName);

        const dataPath = path.join(snapshotDir, collectionManifest.file);
        const fileRaw = await fs.readFile(dataPath, 'utf-8');
        const documents = EJSON.parse(fileRaw) as Array<Record<string, unknown>>;
        if (Array.isArray(documents) && documents.length > 0) {
            await collection.insertMany(documents, { ordered: false });
            restoredDocuments += documents.length;
        }

        const indexes = Array.isArray(collectionManifest.indexes) ? collectionManifest.indexes : [];
        for (const rawIndex of indexes) {
            const name = String(rawIndex?.name || '');
            if (!name || name === '_id_') continue;
            const key = (rawIndex?.key || {}) as Record<string, unknown>;
            const options = pickIndexOptions(rawIndex);
            await collection.createIndex(key as Record<string, number>, options).catch(() => undefined);
        }

        restoredCollections += 1;
    }

    return {
        ok: true,
        action: 'restore',
        snapshotId,
        snapshotRoot,
        snapshotDir,
        manifestPath,
        databaseName: String(db.databaseName || ''),
        restoredCollections,
        restoredDocuments,
    };
}

async function run(): Promise<void> {
    const action = resolveSnapshotAction();
    const snapshotRoot = resolveSnapshotRoot();
    try {
        await connectDB();
        const result = action === 'restore'
            ? await restoreSnapshot(snapshotRoot)
            : await backupSnapshot(snapshotRoot);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_db_snapshot] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
