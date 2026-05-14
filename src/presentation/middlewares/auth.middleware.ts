import { NextFunction, Request, Response } from "express";
import { JwtAdapter } from "../../config";
import { UserModel } from "../../data";
import { getAccessTokenFromRequest } from "../auth/auth-session.helper";
import { sendErrorEnvelope, sendErrorResponse } from "../errors/http-error-response";


export class AuthMiddleware {

    static async validateJWT( req: Request, res: Response, next: NextFunction ) {

        const accessTokenFromCookie = getAccessTokenFromRequest(req);
        const authorization = String(req.header('Authorization') || '');
        const [scheme = "", credentials = ""] = authorization.trim().split(/\s+/);
        const bearerToken = /^bearer$/i.test(scheme) ? credentials : "";
        const token = accessTokenFromCookie || bearerToken;

        if ( !token ) {
            return sendErrorEnvelope(res, {
                statusCode: 401,
                code: "UNAUTHORIZED",
                message: "Authentication required",
                userMessage: "Tu sesión no es válida o expiró.",
            });
        }

        try {
            
            const payload = await JwtAdapter.validarToken<{ id: string; type?: string }>(token);
            if ( !payload || !payload.id || (payload.type && payload.type !== "access") ) {
                return sendErrorEnvelope(res, {
                    statusCode: 401,
                    code: "SESSION_EXPIRED",
                    message: "Access token invalid or expired",
                    userMessage: "Tu sesión expiró. Inicia sesión nuevamente.",
                });
            }

            const user = await UserModel.findById( payload.id );
            if ( !user ) {
                return sendErrorEnvelope(res, {
                    statusCode: 401,
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                    userMessage: "Tu sesión no es válida o expiró.",
                });
            }

            if ( user.status === 'disabled' ) {
                return sendErrorEnvelope(res, {
                    statusCode: 403,
                    code: "USER_DISABLED",
                    message: "User is disabled",
                    userMessage: "Tu usuario está deshabilitado.",
                });
            }

            (req as any).user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            };

            next();


        } catch (error) {
            return sendErrorResponse(res, error);
        }
        
    }

}
