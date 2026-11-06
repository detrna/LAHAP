import type { Router } from "express";
import { randomUUID } from "node:crypto";
import type { ModuleDeps } from "../../module-deps.js";
import { OrdersController } from "../controller/orders.controller.js";
import { PrismaOrdersRepository } from "../repository/prisma/orders-repository.js";
import { createOrdersRouter } from "../routes/orders.routes.js";
import type { BusinessSettings } from "../service/interfaces/business-settings.js";
import type { CheckoutCatalog } from "../service/interfaces/checkout-catalog.js";
import type { CustomerProfiles } from "../service/interfaces/customer-profiles.js";
import type { OrderNotifier } from "../service/interfaces/order-notifier.js";
import type { PromoChecker } from "../service/interfaces/promo-checker.js";
import type { RealtimePublisher } from "../service/interfaces/realtime-publisher.js";
import type { ShoppingList } from "../service/interfaces/shopping-list.js";
import type { SlotObstacles } from "../service/interfaces/slot-obstacles.js";
import type { UnreadCount } from "../service/interfaces/unread-count.js";
import type { TierDiscountProvider } from "../service/interfaces/tier-discount-provider.js";
import { OrdersService } from "../service/orders.service.js";

export interface OrdersContainerDeps extends ModuleDeps {
    readonly catalog: CheckoutCatalog;
    readonly settings: BusinessSettings;
    readonly tierDiscounts: TierDiscountProvider;
    readonly promoChecker: PromoChecker;
    readonly customers: CustomerProfiles;
    readonly notifier: OrderNotifier;
    readonly realtime: RealtimePublisher;
    readonly obstacles: SlotObstacles;
    readonly shoppingList: ShoppingList;
    readonly unreadCount: UnreadCount;
}

export class OrdersContainer {
    readonly service: OrdersService;
    readonly router: Router;

    constructor({
        db,
        adapters,
        catalog,
        settings,
        tierDiscounts,
        promoChecker,
        customers,
        notifier,
        realtime,
        obstacles,
        shoppingList,
        unreadCount,
    }: OrdersContainerDeps) {
        const repository = new PrismaOrdersRepository(db);
        this.service = new OrdersService(repository, {
            clock: adapters.clock,
            logger: adapters.logger,
            cache: adapters.cache,
            paymentGateway: adapters.paymentGateway,
            generateId: randomUUID,
            catalog,
            settings,
            tierDiscounts,
            promoChecker,
            customers,
            notifier,
            realtime,
            obstacles,
            shoppingList,
            unreadCount,
        });
        const controller = new OrdersController(this.service);
        this.router = createOrdersRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
