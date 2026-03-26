/**
 * Global Express namespace augmentation.
 * Overrides Request.user to match our JWT-based auth structure.
 * Required because @types/express v5 introduced a typed user property
 * (from Passport.js) that conflicts with our custom _id-based user shape.
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                id: string;
                username: string;
                email: string;
                role: string;
                fullName: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                permissions?: any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                permissionsV2?: any;
                sessionId?: string;
            };
        }
    }
}

export {};
