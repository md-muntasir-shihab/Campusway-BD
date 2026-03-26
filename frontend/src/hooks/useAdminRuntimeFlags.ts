import { useQuery } from '@tanstack/react-query';
import { adminGetRuntimeSettings } from '../services/api';
import { queryKeys } from '../lib/queryKeys';

export function useAdminRuntimeFlags() {
    const query = useQuery({
        queryKey: queryKeys.runtimeSettings,
        queryFn: async () => (await adminGetRuntimeSettings()).data.featureFlags,
    });

    const flags = query.data || {};
    return {
        ...query,
        trainingMode: Boolean((flags as any).trainingMode),
        requireDeleteKeywordConfirm: (flags as any).requireDeleteKeywordConfirm !== false,
    };
}
