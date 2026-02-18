import { NextFunction, Request, Response } from "express";
import { JwtAdapter } from "../../config";
import { UserModel } from "../../data";
import { getAccessTokenFromRequest } from "../auth/auth-session.helper";


export class AuthMiddleware {

    static async validateJWT( req: Request, res: Response, next: NextFunction ) {

        const requestId = String(res.getHeader("x-request-id") || "");
        const accessTokenFromCookie = getAccessTokenFromRequest(req);
        const authorization = String(req.header('Authorization') || '');
        const [scheme = "", credentials = ""] = authorization.trim().split(/\s+/);
        const bearerToken = /^bearer$/i.test(scheme) ? credentials : "";
        const token = accessTokenFromCookie || bearerToken;

        if ( !token ) {
            return res.status(401).json({
                error: {
                    status: 401,
                    code: "AUTH_401",
                    message: "Authentication required",
                    requestId,
                },
            });
        }

        try {
            
            const payload = await JwtAdapter.validarToken<{ id: string; type?: string }>(token);
            if ( !payload || !payload.id || (payload.type && payload.type !== "access") ) {
                return res.status(401).json({
                    error: {
                        status: 401,
                        code: "AUTH_401",
                        message: "Access token invalid or expired",
                        requestId,
                    },
                });
            }

            const user = await UserModel.findById( payload.id );
            if ( !user ) {
                return res.status(401).json({
                    error: {
                        status: 401,
                        code: "AUTH_401",
                        message: "User not authenticated",
                        requestId,
                    },
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
            
            console.log(error);
            res.status(500).json({
                error: {
                    status: 500,
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Internal server error",
                    requestId,
                },
            });

        }
        
    }

}
