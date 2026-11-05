import { z } from "zod";

export const SEARCH_MAX_LENGTH = 100;

export const searchQuerySchema = z
    .string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .transform(value => (value === "" ? undefined : value))
    .optional();
