
export type CustomFieldErrors = Record<string, string>;

export interface CustomErrorOptions {
    code?: string;
    userMessage?: string;
    retryable?: boolean;
    fieldErrors?: CustomFieldErrors;
    details?: Record<string, any>;
}

export class CustomError extends Error {

    private constructor(
        public readonly statusCode: number,
        public readonly message: string,
        public readonly code: string,
        public readonly userMessage?: string,
        public readonly retryable: boolean = false,
        public readonly fieldErrors?: CustomFieldErrors,
        public readonly details?: Record<string, any>,
    ) {
        super(message);
    }

    private static create(statusCode: number, defaultCode: string, message: string, options?: CustomErrorOptions) {
        return new CustomError(
            statusCode,
            message,
            options?.code ?? defaultCode,
            options?.userMessage,
            options?.retryable ?? false,
            options?.fieldErrors,
            options?.details,
        );
    }

    static validation(message: string, options?: Omit<CustomErrorOptions, "code"> & { code?: string }) {
        return CustomError.create(400, options?.code ?? "VALIDATION_ERROR", message, options);
    }

    static badRequest(message: string, options?: CustomErrorOptions) {
        return CustomError.create(400, "BAD_REQUEST", message, options);
    }

    static unauthorized(message: string, options?: CustomErrorOptions) {
        return CustomError.create(401, "UNAUTHORIZED", message, options);
    }

    static forbidden(message: string, options?: CustomErrorOptions) {
        return CustomError.create(403, "FORBIDDEN", message, options);
    }

    static notFound(message: string, options?: CustomErrorOptions) {
        return CustomError.create(404, "NOT_FOUND", message, options);
    }

    static conflict(message: string, options?: CustomErrorOptions) {
        return CustomError.create(409, "CONFLICT", message, options);
    }

    static tooManyRequests(message: string, options?: CustomErrorOptions) {
        return CustomError.create(429, "RATE_LIMITED", message, options);
    }

    static internalServer(message: string, options?: CustomErrorOptions) {
        console.log(message);
        return CustomError.create(500, "INTERNAL_ERROR", message, options);
    }
    
    static badGateway(message: string, options?: CustomErrorOptions) {
        console.log(message);
        return CustomError.create(502, "DEPENDENCY_UNAVAILABLE", message, options);
    }

    static timeout(message: string, options?: CustomErrorOptions) {
        return CustomError.create(504, "TIMEOUT", message, { ...options, retryable: options?.retryable ?? true });
    }
}
