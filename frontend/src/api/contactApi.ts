import { isAxiosError } from "axios";
import api from "../services/api";
import { mockPublicContactSettings, submitMockContactMessage } from "../mocks/contactMock";
import type {
    ContactCustomLink,
    ContactLinks,
    ContactMessagePayload,
    ContactMessageResponse,
    PublicSettingsContactResponse,
} from "../types/contact";

const isMockMode = String(import.meta.env.VITE_USE_MOCK_API || "false").toLowerCase() === "true";
let preferLegacySettingsEndpoint = false;
let preferLegacyContactSubmit = false;

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null) return {};
    return value as Record<string, unknown>;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
    const normalized = asString(value);
    return normalized || undefined;
}

function normalizeCustomLinks(value: unknown): ContactCustomLink[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            const row = asRecord(item);
            const name = asString(row.name);
            const iconUrl = asString(row.iconUrl);
            const url = asString(row.url);
            const enabled = row.enabled !== false;
            if (!name) return null;
            return {
                name,
                iconUrl,
                url,
                enabled,
            } satisfies ContactCustomLink;
        })
        .filter((item): item is ContactCustomLink => Boolean(item));
}

function normalizePlatformName(value: unknown): string {
    const raw = asString(value).toLowerCase().replace(/[\s_-]+/g, "");
    if (raw === "x") return "twitter";
    if (raw === "ig") return "instagram";
    return raw;
}

function extractSocialLinksFromList(root: Record<string, unknown>): Record<string, string> {
    const list = Array.isArray(root.socialLinksList) ? root.socialLinksList : [];
    return list.reduce<Record<string, string>>((acc, item) => {
        const row = asRecord(item);
        const platform = normalizePlatformName(row.platformName || row.platform);
        const url = asString(row.targetUrl || row.url);
        if (!platform || !url) return acc;
        acc[platform] = url;
        return acc;
    }, {});
}

function normalizeContactLinks(root: Record<string, unknown>): ContactLinks {
    const links = asRecord(root.contactLinks);
    const socialLinks = asRecord(root.socialLinks);
    const socialLinksFromList = extractSocialLinksFromList(root);

    return {
        phone: asOptionalString(links.phone || root.contactPhone),
        email: asOptionalString(links.email || root.contactEmail),
        address: asOptionalString(links.address),
        whatsappUrl: asOptionalString(links.whatsappUrl || root.whatsappUrl || socialLinks.whatsapp || socialLinksFromList.whatsapp),
        messengerUrl: asOptionalString(links.messengerUrl || root.messengerUrl || socialLinks.messenger || socialLinksFromList.messenger),
        facebookUrl: asOptionalString(links.facebookUrl || socialLinks.facebook || socialLinksFromList.facebook),
        telegramUrl: asOptionalString(links.telegramUrl || socialLinks.telegram || socialLinksFromList.telegram),
        instagramUrl: asOptionalString(links.instagramUrl || socialLinks.instagram || socialLinksFromList.instagram),
        customLinks: normalizeCustomLinks(links.customLinks),
    };
}

function normalizePublicSettingsPayload(raw: unknown): PublicSettingsContactResponse {
    const payload = asRecord(raw);
    const nestedSettings = asRecord(payload.settings);
    const merged: Record<string, unknown> = {
        ...nestedSettings,
        ...payload,
    };
    delete merged.settings;

    const footer = asRecord(merged.footer);
    return {
        siteName: asString(merged.siteName || merged.websiteName) || "CampusWay",
        logoUrl: asString(merged.logoUrl || merged.logo),
        siteDescription: asString(merged.siteDescription || merged.metaDescription || merged.motto),
        contactLinks: normalizeContactLinks(merged),
        footer: {
            shortNote: asOptionalString(footer.shortNote || merged.footerShortNote),
        },
    };
}

export async function fetchPublicContactSettings(): Promise<PublicSettingsContactResponse> {
    if (isMockMode) return mockPublicContactSettings;

    if (preferLegacySettingsEndpoint) {
        const response = await api.get<unknown>("/settings");
        return normalizePublicSettingsPayload(response.data);
    }

    try {
        const response = await api.get<unknown>("/settings/public");
        return normalizePublicSettingsPayload(response.data);
    } catch (error: unknown) {
        if (!isAxiosError(error) || error.response?.status !== 404) {
            throw error;
        }

        preferLegacySettingsEndpoint = true;
        const fallbackResponse = await api.get<unknown>("/settings");
        return normalizePublicSettingsPayload(fallbackResponse.data);
    }
}

function normalizeContactSubmitResponse(raw: unknown): ContactMessageResponse {
    const payload = asRecord(raw);
    const ticketId = asOptionalString(payload.ticketId || payload.id);
    return {
        ok: true,
        ticketId,
    };
}

async function submitLegacyContactMessage(
    payload: ContactMessagePayload,
): Promise<ContactMessageResponse> {
    const legacyPayload = {
        name: payload.name,
        phone: payload.phone,
        email: payload.email.trim(),
        subject: payload.subject,
        message: payload.message,
        consent: payload.consent,
        ...(payload.topic ? { topic: payload.topic } : {}),
    };
    const legacyResponse = await api.post<unknown>("/contact", legacyPayload);
    preferLegacyContactSubmit = true;
    return normalizeContactSubmitResponse(legacyResponse.data);
}

export async function submitContactMessage(
    payload: ContactMessagePayload,
): Promise<ContactMessageResponse> {
    if (isMockMode) return submitMockContactMessage(payload);

    if (preferLegacyContactSubmit) {
        return submitLegacyContactMessage(payload);
    }

    try {
        return submitLegacyContactMessage(payload);
    } catch (error: unknown) {
        const primaryStatus = isAxiosError(error) ? error.response?.status : null;
        const shouldTryModernEndpoint =
            primaryStatus === 404 || primaryStatus === 405 || primaryStatus === 501;

        if (!shouldTryModernEndpoint) {
            throw error;
        }

        try {
            const response = await api.post<unknown>("/contact/messages", payload);
            return normalizeContactSubmitResponse(response.data);
        } catch (legacyError: unknown) {
            throw legacyError;
        }
    }
}
