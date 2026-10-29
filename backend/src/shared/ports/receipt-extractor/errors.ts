import { AppError } from "../../errors/app-error.js";

export class ReceiptExtractionError extends AppError {
    readonly code: string = "RECEIPT_EXTRACTION_FAILED";
    readonly statusCode: number = 400;

    constructor(
        message: string,
        options?: { cause?: unknown; code?: string; statusCode?: number },
    ) {
        super(message, { cause: options?.cause });
        if (options?.code) this.code = options.code;
        if (options?.statusCode) this.statusCode = options.statusCode;
    }
}

export class InvalidReceiptImageError extends ReceiptExtractionError {
    override readonly code = "INVALID_RECEIPT_IMAGE";
    override readonly statusCode = 400;
}

export class LowConfidenceReceiptError extends ReceiptExtractionError {
    override readonly code = "LOW_CONFIDENCE_RECEIPT";
    override readonly statusCode = 400;
}

export class NoReceiptItemsFoundError extends ReceiptExtractionError {
    override readonly code = "NO_RECEIPT_ITEMS_FOUND";
    override readonly statusCode = 400;
}

export class ReceiptExtractorProviderError extends ReceiptExtractionError {
    override readonly code = "RECEIPT_EXTRACTOR_PROVIDER_ERROR";
    override readonly statusCode = 502;
}

