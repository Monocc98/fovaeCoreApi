import { NextFunction, Request, Response } from "express";
import { envs } from "../../config";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class CsrfMiddleware {
  static validate(req: Request, res: Response, next: NextFunction) {
    if (!unsafeMethods.has(String(req.method || "").toUpperCase())) return next();

    const isLoginOrRegister =
      req.path === "/api/auth/login" || req.path === "/api/auth/register";
    if (isLoginOrRegister) return next();

    const hasAuthCookie =
      Boolean(req.cookies?.[envs.ACCESS_COOKIE_NAME]) ||
      Boolean(req.cookies?.[envs.REFRESH_COOKIE_NAME]);
    if (!hasAuthCookie) return next();

    const csrfCookie = String(req.cookies?.[envs.CSRF_COOKIE_NAME] || "");
    const csrfHeader = String(req.header(envs.CSRF_HEADER_NAME) || "");
    const requestId = String(res.getHeader("x-request-id") || "");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({
        error: {
          status: 403,
          code: "AUTH_403",
          message: "CSRF validation failed",
          requestId,
        },
      });
    }

    next();
  }
}
