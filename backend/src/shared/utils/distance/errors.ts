import { AppError } from "../../errors/app-error.js";
import type { Coordinates } from "./distance.js";

export class InvalidCoordinatesError extends AppError {
    readonly code = "INVALID_COORDINATES";
    readonly statusCode = 400;

    constructor(public readonly coordinates: Coordinates) {
        super(`invalid coordinates: lat=${coordinates.lat}, lng=${coordinates.lng}`);
    }
}

