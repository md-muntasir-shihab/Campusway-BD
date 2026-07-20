import { OpenPanel } from '@openpanel/web';

let openPanelInstance: OpenPanel | null = null;

export function initOpenPanel(): OpenPanel | null {
    if (openPanelInstance) return openPanelInstance;

    const clientId = import.meta.env.VITE_OPENPANEL_CLIENT_ID;
    const apiUrl = import.meta.env.VITE_OPENPANEL_API_URL;

    if (!clientId) {
        return null;
    }

    try {
        const options: any = {
            clientId,
            trackScreenViews: true,
            trackOutgoingLinks: true,
            trackAttributes: true,
        };
        if (apiUrl) {
            options.apiUrl = apiUrl;
        }
        openPanelInstance = new OpenPanel(options);
        return openPanelInstance;
    } catch (err) {
        console.warn('[OpenPanel] Failed to initialize tracker:', err);
        return null;
    }
}

export function trackOpenPanelEvent(eventName: string, properties?: Record<string, any>): void {
    if (!openPanelInstance) {
        openPanelInstance = initOpenPanel();
    }
    if (openPanelInstance) {
        try {
            openPanelInstance.track(eventName, properties);
        } catch (err) {
            console.warn('[OpenPanel] Failed to send event:', err);
        }
    }
}

export function identifyOpenPanelUser(userId: string, traits?: Record<string, any>): void {
    if (!openPanelInstance) {
        openPanelInstance = initOpenPanel();
    }
    if (openPanelInstance) {
        try {
            openPanelInstance.identify({
                profileId: userId,
                ...traits,
            });
        } catch (err) {
            console.warn('[OpenPanel] Failed to identify user:', err);
        }
    }
}

export function resetOpenPanelUser(): void {
    if (openPanelInstance) {
        try {
            openPanelInstance.clear();
        } catch (err) {
            console.warn('[OpenPanel] Failed to clear session:', err);
        }
    }
}
