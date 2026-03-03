import { NextFunction, Request, Response } from "express";

export class SuperAdminMiddleware {

    static requireSuperAdmin( req: Request, res: Response, next: NextFunction ) {
        const requestId = String(res.getHeader("x-request-id") || "");
        const currentUser = (req as any).user;

        if ( !currentUser || currentUser.role !== 'SUPER_ADMIN' ) {
            return res.status(403).json({
                error: {
                    status: 403,
                    code: "AUTH_403",
                    message: "Super admin access required",
                    requestId,
                },
            });
        }

        next();
    }
}
