export abstract class AppError extends Error {
    abstract readonly code: string;
    abstract readonly statusCode: number;

    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = new.target.name;
    }
}
