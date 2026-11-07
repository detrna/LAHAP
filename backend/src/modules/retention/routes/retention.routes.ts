import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { RetentionController } from "../controller/retention.controller.js";
import {
    churnFollowUpSchema,
    churnListQuerySchema,
    churnUserIdParamsSchema,
    messageTemplateCreateSchema,
    messageTemplateIdParamsSchema,
    messageTemplateListQuerySchema,
    messageTemplateUpdateSchema,
} from "../schema/retention.schemas.js";

export interface RetentionRouterDeps {
    readonly controller: RetentionController;
    readonly tokenProvider: TokenProvider;
}

export function createRetentionRouter({ controller, tokenProvider }: RetentionRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get(
        "/admin/message-templates",
        signedIn,
        admin,
        validateQuery(messageTemplateListQuerySchema),
        paginate(),
        controller.listMessageTemplates,
    );
    router.post(
        "/admin/message-templates",
        signedIn,
        admin,
        validateBody(messageTemplateCreateSchema),
        controller.createMessageTemplate,
    );
    router.get(
        "/admin/message-templates/:id",
        signedIn,
        admin,
        validateParams(messageTemplateIdParamsSchema),
        controller.getMessageTemplate,
    );
    router.patch(
        "/admin/message-templates/:id",
        signedIn,
        admin,
        validateRequest({ params: messageTemplateIdParamsSchema, body: messageTemplateUpdateSchema }),
        controller.updateMessageTemplate,
    );
    router.delete(
        "/admin/message-templates/:id",
        signedIn,
        admin,
        validateParams(messageTemplateIdParamsSchema),
        controller.deleteMessageTemplate,
    );

    router.get(
        "/admin/retention/churn",
        signedIn,
        admin,
        validateQuery(churnListQuerySchema),
        paginate(),
        controller.listChurnedCustomers,
    );

    router.post(
        "/admin/retention/churn/:userId/follow-up",
        signedIn,
        admin,
        validateRequest({ params: churnUserIdParamsSchema, body: churnFollowUpSchema }),
        controller.buildFollowUp,
    );

    return router;
}
