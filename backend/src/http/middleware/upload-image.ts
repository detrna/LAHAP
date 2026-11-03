import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import { PayloadTooLargeError, RequestValidationError, UnsupportedMediaTypeError } from "./errors.js";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
    bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string): number[] => [...text].map(char => char.charCodeAt(0));

export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
    if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
    return null;
}

export interface UploadImageOptions {
    readonly field: string;
    readonly maxBytes: number;
    readonly maxFields?: number | undefined;
}

function toUploadError(err: unknown, options: UploadImageOptions): Error {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case "LIMIT_FILE_SIZE":
                return new PayloadTooLargeError(options.maxBytes, { cause: err });
            case "LIMIT_UNEXPECTED_FILE":
                return new RequestValidationError(
                    [
                        {
                            target: "body",
                            path: err.field ?? options.field,
                            message: `unexpected file field; send the image as "${options.field}"`,
                            code: "unexpected_file",
                        },
                    ],
                    { cause: err },
                );
            default:
                return new RequestValidationError(
                    [
                        {
                            target: "body",
                            path: err.field ?? "",
                            message: err.message.toLowerCase(),
                            code: err.code.toLowerCase(),
                        },
                    ],
                    { cause: err },
                );
        }
    }

    return new RequestValidationError(
        [{ target: "body", path: "", message: "malformed multipart body", code: "malformed_multipart" }],
        { cause: err },
    );
}

export function uploadImage(options: UploadImageOptions): RequestHandler {
    const maxFields = options.maxFields ?? 10;
    const parse = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: options.maxBytes,
            files: 1,
            fields: maxFields,
            parts: maxFields + 1,
            fieldSize: 64 * 1024,
        },
    }).single(options.field);

    return (req: Request, res: Response, next: NextFunction): void => {
        parse(req, res, (err?: unknown) => {
            if (err !== undefined && err !== null) {
                next(toUploadError(err, options));
                return;
            }

            const file = req.file;
            if (file === undefined) {
                const message = `${options.field} is required`;
                next(new RequestValidationError([{ target: "body", path: options.field, message, code: "required" }]));
                return;
            }

            const mimeType = detectImageType(file.buffer);
            if (mimeType === null) {
                next(new UnsupportedMediaTypeError());
                return;
            }

            file.mimetype = mimeType;
            next();
        });
    };
}
