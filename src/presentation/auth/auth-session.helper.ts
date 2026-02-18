import crypto from "crypto";
import { CookieOptions, Request, Response } from "express";
import { envs } from "../../config";
import { CustomError } from "../../domain";

const allowedSameSite = new Set(["lax", "strict", "none"]);

const normalizedSameSite = (): "lax" | "strict" | "none" => {
  const value = String(envs.COOKIE_SAMESITE || "lax").toLowerCase();
  if (!allowedSameSite.has(value)) return "lax";
  return value as "lax" | "strict" | "none";
};

export const parseDurationToMs = (duration: string): number => {
  const text = String(duration || "").trim().toLowerCase();
  const match = text.match(/^(\d+)\s*([smhd])$/);
  if (!match) {
    throw CustomError.internalServer(`Invalid duration format: ${duration}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const buildBaseCookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: envs.COOKIE_SECURE,
  sameSite: normalizedSameSite(),
  path: "/",
  maxAge: maxAgeMs,
});

export const setAuthCookies = (params: {
  res: Response;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}) => {
  const accessMaxAge = parseDurationToMs(envs.ACCESS_TOKEN_TTL);
  const refreshMaxAge = parseDurationToMs(envs.REFRESH_TOKEN_TTL);

  params.res.cookie(
    envs.ACCESS_COOKIE_NAME,
    params.accessToken,
    buildBaseCookieOptions(accessMaxAge)
  );

  params.res.cookie(
    envs.REFRESH_COOKIE_NAME,
    params.refreshToken,
    buildBaseCookieOptions(refreshMaxAge)
  );

  params.res.cookie(envs.CSRF_COOKIE_NAME, params.csrfToken, {
    httpOnly: false,
    secure: envs.COOKIE_SECURE,
    sameSite: normalizedSameSite(),
    path: "/",
    maxAge: refreshMaxAge,
  });
};

export const clearAuthCookies = (res: Response) => {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: envs.COOKIE_SECURE,
    sameSite: normalizedSameSite(),
    path: "/",
  };

  res.clearCookie(envs.ACCESS_COOKIE_NAME, cookieOptions);
  res.clearCookie(envs.REFRESH_COOKIE_NAME, cookieOptions);
  res.clearCookie(envs.CSRF_COOKIE_NAME, {
    ...cookieOptions,
    httpOnly: false,
  });
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createRandomToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const getRefreshTokenFromRequest = (req: Request): string => {
  return String(req.cookies?.[envs.REFRESH_COOKIE_NAME] || "").trim();
};

export const getAccessTokenFromRequest = (req: Request): string => {
  return String(req.cookies?.[envs.ACCESS_COOKIE_NAME] || "").trim();
};
