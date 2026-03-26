import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import {
    ExamAnswerMap,
    saveExamAttemptAnswer,
} from '../services/api';

const CACHE_DB_NAME = 'campusway_exam_cache';
const CACHE_STORE_NAME = 'attempt_autosave';
const CACHE_KEY_PREFIX = 'campusway:attempt-autosave:';

type CachedAttemptState = {
    answers: ExamAnswerMap;
    attemptRevision: number;
    updatedAt: string;
};

type UseAutoSaveOptions = {
    examId: string;
    attemptId?: string;
    answers: ExamAnswerMap;
    attemptRevision?: number;
    intervalMs?: number;
    enabled?: boolean;
    onRevisionChange?: (revision: number) => void;
    onStaleAttempt?: (latestRevision: number) => void;
    onHydrateCachedAnswers?: (cachedAnswers: ExamAnswerMap) => void;
};

function getCacheKey(examId: string, attemptId?: string): string {
    return `${CACHE_KEY_PREFIX}${examId}:${attemptId || 'pending'}`;
}

function isBrowserOnline(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return true;
    }
    return navigator.onLine;
}

function openCacheDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const request = window.indexedDB.open(CACHE_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function readCache(key: string): Promise<CachedAttemptState | null> {
    const db = await openCacheDb();
    if (db) {
        try {
            const result = await new Promise<CachedAttemptState | null>((resolve) => {
                const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = tx.objectStore(CACHE_STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => resolve((req.result as CachedAttemptState | undefined) || null);
                req.onerror = () => resolve(null);
            });
            db.close();
            return result;
        } catch {
            db.close();
        }
    }

    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as CachedAttemptState) : null;
    } catch {
        return null;
    }
}

async function writeCache(key: string, value: CachedAttemptState): Promise<void> {
    const db = await openCacheDb();
    if (db) {
        try {
            await new Promise<void>((resolve) => {
                const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
                tx.objectStore(CACHE_STORE_NAME).put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
            db.close();
            return;
        } catch {
            db.close();
        }
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Best-effort fallback only
    }
}

async function removeCache(key: string): Promise<void> {
    const db = await openCacheDb();
    if (db) {
        try {
            await new Promise<void>((resolve) => {
                const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
                tx.objectStore(CACHE_STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
            db.close();
            return;
        } catch {
            db.close();
        }
    }

    try {
        window.localStorage.removeItem(key);
    } catch {
        // Best-effort fallback only
    }
}

function toAnswerPayload(answers: ExamAnswerMap) {
    return Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        selectedAnswer: answer.selectedAnswer,
        writtenAnswerUrl: answer.writtenAnswerUrl,
        savedAt: new Date(),
    }));
}

export function useAutoSave({
    examId,
    attemptId,
    answers,
    attemptRevision = 0,
    intervalMs = 5000,
    enabled = true,
    onRevisionChange,
    onStaleAttempt,
    onHydrateCachedAnswers,
}: UseAutoSaveOptions) {
    const [isSaving, setIsSaving] = useState(false);
    const [isOffline, setIsOffline] = useState(!isBrowserOnline());
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [latestAttemptRevision, setLatestAttemptRevision] = useState<number>(attemptRevision);

    const answersRef = useRef<ExamAnswerMap>(answers);
    const latestRevisionRef = useRef<number>(attemptRevision);
    const hasChangedRef = useRef(false);
    const isSavingRef = useRef(false);

    const cacheKey = useMemo(() => getCacheKey(examId, attemptId), [examId, attemptId]);

    useEffect(() => {
        answersRef.current = answers;
        hasChangedRef.current = true;
    }, [answers]);

    useEffect(() => {
        latestRevisionRef.current = attemptRevision;
        setLatestAttemptRevision(attemptRevision);
    }, [attemptRevision]);

    useEffect(() => {
        if (!attemptId) return;
        const persist = async () => {
            await writeCache(cacheKey, {
                answers: answersRef.current,
                attemptRevision: latestRevisionRef.current,
                updatedAt: new Date().toISOString(),
            });
        };
        persist().catch(() => undefined);
    }, [answers, attemptId, cacheKey]);

    useEffect(() => {
        if (!attemptId) return;
        const hydrate = async () => {
            const cached = await readCache(cacheKey);
            if (!cached) return;

            if (typeof cached.attemptRevision === 'number' && cached.attemptRevision > latestRevisionRef.current) {
                latestRevisionRef.current = cached.attemptRevision;
                setLatestAttemptRevision(cached.attemptRevision);
                onRevisionChange?.(cached.attemptRevision);
            }

            if (Object.keys(answersRef.current).length === 0 && Object.keys(cached.answers || {}).length > 0) {
                onHydrateCachedAnswers?.(cached.answers);
                hasChangedRef.current = true;
            }
        };
        hydrate().catch(() => undefined);
    }, [attemptId, cacheKey, onHydrateCachedAnswers, onRevisionChange]);

    const flushQueue = useCallback(async () => {
        if (!enabled || !attemptId || isSavingRef.current || !hasChangedRef.current) return;

        if (!isBrowserOnline()) {
            setIsOffline(true);
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        setIsOffline(false);

        try {
            const response = await saveExamAttemptAnswer(examId, attemptId, {
                answers: toAnswerPayload(answersRef.current),
                attemptRevision: latestRevisionRef.current,
            });

            const nextRevision = Number(response.data?.attemptRevision ?? latestRevisionRef.current);
            latestRevisionRef.current = nextRevision;
            setLatestAttemptRevision(nextRevision);
            onRevisionChange?.(nextRevision);

            const savedAt = String(response.data?.savedAt || new Date().toISOString());
            setLastSavedAt(savedAt);
            hasChangedRef.current = false;
            await removeCache(cacheKey);
        } catch (error) {
            hasChangedRef.current = true;

            const axiosError = error as AxiosError<{ latestRevision?: number }>;
            const status = axiosError.response?.status;
            if (status === 409) {
                const latest = Number(axiosError.response?.data?.latestRevision);
                if (Number.isFinite(latest)) {
                    latestRevisionRef.current = latest;
                    setLatestAttemptRevision(latest);
                    onStaleAttempt?.(latest);
                }
            }

            if (!axiosError.response) {
                setIsOffline(true);
            }
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [enabled, attemptId, examId, cacheKey, onRevisionChange, onStaleAttempt]);

    useEffect(() => {
        if (!enabled) return undefined;
        const interval = window.setInterval(() => {
            flushQueue().catch(() => undefined);
        }, intervalMs);
        return () => window.clearInterval(interval);
    }, [enabled, flushQueue, intervalMs]);

    useEffect(() => {
        if (!enabled) return undefined;
        const handleOnline = () => {
            setIsOffline(false);
            flushQueue().catch(() => undefined);
        };
        const handleOffline = () => {
            setIsOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [enabled, flushQueue]);

    useEffect(() => {
        return () => {
            flushQueue().catch(() => undefined);
        };
    }, [flushQueue]);

    return {
        flushQueue,
        isSaving,
        isOffline,
        lastSavedAt,
        latestAttemptRevision,
    };
}
