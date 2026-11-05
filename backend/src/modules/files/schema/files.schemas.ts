import { z } from "zod";
import { PHOTO_FOLDERS } from "../../../shared/media/photo.js";

export const fileUploadSchema = z.object({ folder: z.enum(PHOTO_FOLDERS) });

export type FileUploadBody = z.infer<typeof fileUploadSchema>;
