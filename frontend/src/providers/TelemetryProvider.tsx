import React, { createContext, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import Tracker from '@openreplay/tracker';

const TelemetryContext = createContext<any>(null);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
        if (sentryDsn) {
            Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1.0 });
        }
        
        const openReplayKey = import.meta.env.VITE_OPENREPLAY_PROJECT_KEY;
        if (openReplayKey) {
            const tracker = new Tracker({ projectKey: openReplayKey });
            tracker.start();
        }
    }, []);

    return (
        <TelemetryContext.Provider value={{}}>
            {children}
        </TelemetryContext.Provider>
    );
};
