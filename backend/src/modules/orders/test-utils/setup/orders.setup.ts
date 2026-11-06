import type { Cache } from "../../../../shared/ports/cache/cache.js";
import type { PaymentGateway } from "../../../../shared/ports/payment-gateway/payment-gateway.js";
import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { createMockLogger, type MockLogger } from "../../../../../tests/utils/mocks/logger.js";
import { buildSettings } from "../../../settings/test-utils/factory/settings.factory.js";
import { OrdersController } from "../../controller/orders.controller.js";
import type { BusinessSettings } from "../../service/interfaces/business-settings.js";
import type { CheckoutCatalog } from "../../service/interfaces/checkout-catalog.js";
import type { CustomerProfiles } from "../../service/interfaces/customer-profiles.js";
import type { OrderNotifier } from "../../service/interfaces/order-notifier.js";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";
import type { PromoChecker } from "../../service/interfaces/promo-checker.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { ShoppingList } from "../../service/interfaces/shopping-list.js";
import type { SlotObstacles } from "../../service/interfaces/slot-obstacles.js";
import type { UnreadCount } from "../../service/interfaces/unread-count.js";
import type { TierDiscountProvider } from "../../service/interfaces/tier-discount-provider.js";
import { OrdersService } from "../../service/orders.service.js";
import {
    createMockBusinessSettings,
    createMockCache,
    createMockCheckoutCatalog,
    createMockCustomerProfiles,
    createMockOrderNotifier,
    createMockOrdersRepository,
    createMockOrdersService,
    createMockPaymentGateway,
    createMockPromoChecker,
    createMockRealtimePublisher,
    createMockShoppingList,
    createMockSlotObstacles,
    createMockUnreadCount,
    createMockTierDiscountProvider,
    type Mocked,
    type MockedOrdersService,
} from "../mocks/orders.mocks.js";

export interface OrdersServiceSetup {
    readonly repository: Mocked<OrdersRepository>;
    readonly clock: FixedClock;
    readonly logger: MockLogger;
    readonly cache: Mocked<Cache>;
    readonly paymentGateway: Mocked<PaymentGateway>;
    readonly catalog: Mocked<CheckoutCatalog>;
    readonly settings: Mocked<BusinessSettings>;
    readonly tierDiscounts: Mocked<TierDiscountProvider>;
    readonly promoChecker: Mocked<PromoChecker>;
    readonly customers: Mocked<CustomerProfiles>;
    readonly notifier: Mocked<OrderNotifier>;
    readonly realtime: Mocked<RealtimePublisher>;
    readonly obstacles: Mocked<SlotObstacles>;
    readonly shoppingList: Mocked<ShoppingList>;
    readonly unreadCount: Mocked<UnreadCount>;
    readonly service: OrdersService;
}

export interface OrdersControllerSetup {
    readonly ordersService: MockedOrdersService;
    readonly controller: OrdersController;
}

export function setupOrdersService(now?: string): OrdersServiceSetup {
    const repository = createMockOrdersRepository();
    const clock = createFixedClock(now);
    const logger = createMockLogger();
    const cache = createMockCache();
    const paymentGateway = createMockPaymentGateway();
    const catalog = createMockCheckoutCatalog();
    const settings = createMockBusinessSettings();
    settings.getSettings.mockResolvedValue(buildSettings());
    const tierDiscounts = createMockTierDiscountProvider();
    const promoChecker = createMockPromoChecker();
    const customers = createMockCustomerProfiles();
    const notifier = createMockOrderNotifier();
    const realtime = createMockRealtimePublisher();
    const obstacles = createMockSlotObstacles();
    const shoppingList = createMockShoppingList();
    const unreadCount = createMockUnreadCount();
    let nextId = 0;
    const generateId = () => `00000000-0000-4000-8000-${(++nextId).toString().padStart(12, "0")}`;
    return {
        repository,
        clock,
        logger,
        cache,
        paymentGateway,
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
        service: new OrdersService(repository, {
            clock,
            logger,
            cache,
            paymentGateway,
            generateId,
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
        }),
    };
}

export function setupOrdersController(): OrdersControllerSetup {
    const ordersService = createMockOrdersService();
    return {
        ordersService,
        controller: new OrdersController(ordersService as unknown as OrdersService),
    };
}
