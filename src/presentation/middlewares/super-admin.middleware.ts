import { NextFunction, Request, Response } from "express";
import { sendErrorEnvelope } from "../errors/http-error-response";

export class SuperAdminMiddleware {

    static requireSuperAdmin( req: Request, res: Response, next: NextFunction ) {
        const currentUser = (req as any).user;

        if ( !currentUser || currentUser.role !== 'SUPER_ADMIN' ) {
            return sendErrorEnvelope(res, {
                statusCode: 403,
                code: "FORBIDDEN",
                message: "Super admin access required",
                userMessage: "No tienes permisos suficientes para realizar esta acción.",
            });
        }

        next();
    }
}
