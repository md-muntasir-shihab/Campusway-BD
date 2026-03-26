import type {
    ContactMessagePayload,
    ContactMessageResponse,
    PublicSettingsContactResponse,
} from "../types/contact";

export const mockPublicContactSettings: PublicSettingsContactResponse = {
    siteName: "CampusWay",
    logoUrl: "/logo.png",
    siteDescription: "CampusWay support team is available for admission and exam guidance.",
    contactLinks: {
        phone: "+8801700000000",
        email: "support@campusway.com",
        address: "Dhaka, Bangladesh",
        whatsappUrl: "https://wa.me/8801700000000",
        messengerUrl: "https://m.me/campusway",
        facebookUrl: "https://facebook.com/campusway",
        telegramUrl: "https://t.me/campusway",
        instagramUrl: "https://instagram.com/campusway",
        customLinks: [
            {
                name: "YouTube",
                iconUrl: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
                url: "https://youtube.com/@campusway",
                enabled: true,
            },
            {
                name: "LinkedIn",
                iconUrl: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
                url: "https://linkedin.com/company/campusway",
                enabled: false,
            },
        ],
    },
    footer: {
        shortNote: "By contacting us, you agree to CampusWay About, Terms, and Privacy pages.",
    },
};

export async function submitMockContactMessage(
    _payload: ContactMessagePayload,
): Promise<ContactMessageResponse> {
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    return {
        ok: true,
        ticketId: `CW-${Math.floor(100000 + Math.random() * 900000)}`,
    };
}

