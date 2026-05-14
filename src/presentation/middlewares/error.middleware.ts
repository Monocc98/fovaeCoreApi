import { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../errors/http-error-response";

export class ErrorMiddleware {
  static handle(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    return sendErrorResponse(res, error);
  }
}
