import { NextFunction, Request, Response } from "express";
import { envs } from "../../config";
import { sendErrorEnvelope } from "../errors/http-error-response";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class CsrfMiddleware {
  static validate(req: Request, res: Response, next: NextFunction) {
    if (!unsafeMethods.has(String(req.method || "").toUpperCase())) return next();

    const csrfExcludedPaths = new Set([
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/renew",
      "/api/auth/logout",
    ]);
    if (csrfExcludedPaths.has(req.path)) return next();

    const hasAuthCookie =
      Boolean(req.cookies?.[envs.ACCESS_COOKIE_NAME]) ||
      Boolean(req.cookies?.[envs.REFRESH_COOKIE_NAME]);
    if (!hasAuthCookie) return next();

    const csrfCookie = String(req.cookies?.[envs.CSRF_COOKIE_NAME] || "");
    const csrfHeader = String(req.header(envs.CSRF_HEADER_NAME) || "");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return sendErrorEnvelope(res, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "CSRF validation failed",
        userMessage: "No se pudo validar la sesión de seguridad. Intenta recargar la página.",
      });
    }

    next();
  }
}
