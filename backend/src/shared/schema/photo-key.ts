import { z } from "zod";

export const PHOTO_KEY_MAX_LENGTH = 255;

export const photoKeySchema = z.string().trim().min(1).max(PHOTO_KEY_MAX_LENGTH);
