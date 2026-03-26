import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPublicContactSettings, submitContactMessage } from "../api/contactApi";
import type { ContactMessagePayload } from "../types/contact";

export const contactKeys = {
    all: ["contact"] as const,
    publicSettings: () => [...contactKeys.all, "settings", "public"] as const,
    submitMessage: () => [...contactKeys.all, "message", "submit"] as const,
};

export function usePublicContactSettings() {
    return useQuery({
        queryKey: contactKeys.publicSettings(),
        queryFn: fetchPublicContactSettings,
        staleTime: 5 * 60 * 1000,
    });
}

export function useSubmitContactMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: contactKeys.submitMessage(),
        mutationFn: (payload: ContactMessagePayload) => submitContactMessage(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.publicSettings() }).catch(() => undefined);
        },
    });
}

