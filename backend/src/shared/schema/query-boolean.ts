import { z } from "zod";

export const queryBooleanSchema = z.stringbool({ truthy: ["true"], falsy: ["false"], case: "sensitive" });
