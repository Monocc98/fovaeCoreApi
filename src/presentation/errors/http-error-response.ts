import { Response } from "express";
import { CustomError, CustomFieldErrors } from "../../domain";

interface ErrorEnvelopeOptions {
  statusCode: number;
  code: string;
  message: string;
  userMessage?: string;
  retryable?: boolean;
  fieldErrors?: CustomFieldErrors;
  details?: Record<string, any>;
}

const defaultUserMessageByStatus = (statusCode: number) => {
  if (statusCode === 401) return "Tu sesión no es válida o expiró.";
  if (statusCode === 403) return "No tienes permiso para realizar esta acción.";
  if (statusCode === 404) return "No se encontró el recurso solicitado.";
  if (statusCode >= 500) return "Ocurrió un error interno. Inténtalo de nuevo.";
  return "No se pudo completar la solicitud.";
};

const getRequestId = (res: Response) => String(res.getHeader("x-request-id") || "");

export const sendErrorEnvelope = (res: Response, options: ErrorEnvelopeOptions) => {
  const requestId = getRequestId(res);

  return res.status(options.statusCode).json({
    error: {
      code: options.code,
      message: options.message,
      userMessage: options.userMessage ?? defaultUserMessageByStatus(options.statusCode),
      retryable: options.retryable ?? false,
      fieldErrors: options.fieldErrors ?? {},
      details: options.details ?? {},
      status: options.statusCode,
    },
    requestId,
  });
};

export const sendErrorResponse = (res: Response, error: unknown) => {
  if (error instanceof CustomError) {
    return sendErrorEnvelope(res, {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      fieldErrors: error.fieldErrors,
      details: error.details,
    });
  }

  console.log(`${ error }`);

  return sendErrorEnvelope(res, {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    userMessage: "Ocurrió un error interno. Inténtalo de nuevo.",
    retryable: false,
  });
};

export const sendValidationError = (
  res: Response,
  message: string,
  fieldErrors?: CustomFieldErrors,
  details?: Record<string, any>,
) =>
  sendErrorEnvelope(res, {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message,
    userMessage: message,
    retryable: false,
    fieldErrors,
    details,
  });

export const sendUnauthorizedError = (res: Response, message = "Authentication required") =>
  sendErrorEnvelope(res, {
    statusCode: 401,
    code: "UNAUTHORIZED",
    message,
    userMessage: "Tu sesión no es válida o expiró.",
    retryable: false,
  });
