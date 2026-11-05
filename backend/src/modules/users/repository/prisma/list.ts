import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { and, not, or } from "@prisma/orm-postgres/orm-client";
import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import { toContainsPattern } from "../../../../infrastructure/database/prisma/like.js";
import type { UserListQuery, UserListRecord } from "../../service/interfaces/users.repository.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { toUserRecord } from "./to-user-record.js";
import type { PrismaUsersRepository } from "./users-repository.js";

function matchingUsers(orm: Db["orm"], query: UserListQuery) {
    let users = orm.public.User;

    if (query.search !== undefined) {
        const pattern = toContainsPattern(query.search);
        const phonePatterns = [
            pattern,
            ...(query.phoneSearch !== undefined ? [toContainsPattern(query.phoneSearch)] : []),
        ];
        users = users.where(user =>
            or(
                user.name.ilike(pattern),
                user.email.ilike(pattern),
                ...phonePatterns.map(phonePattern => user.phone.ilike(phonePattern)),
            ),
        );
    }
    if (query.roles !== undefined && query.roles.length > 0) {
        const roles = query.roles as Varchar<20>[];
        users = users.where(user => user.role.in(roles));
    }
    if (query.isActive !== undefined) {
        users = users.where({ isActive: query.isActive });
    }
    if (query.isChurned !== undefined) {
        const { churnCutoff, isChurned } = query;
        users = users.where(user => {
            const churned = and(
                user.role.eq("CUSTOMER"),
                user.subscriptions.some(subscription => subscription.status.eq("Success")),
                user.subscriptions.none(subscription =>
                    and(subscription.status.eq("Success"), subscription.endDate.gte(churnCutoff)),
                ),
            );
            return isChurned ? churned : not(churned);
        });
    }

    return users;
}

export async function list(this: PrismaUsersRepository, query: UserListQuery): Promise<UserListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            matchingUsers(this.db.orm, query)
                .include("allergies", link => link.include("allergy"))
                .include("subscriptions", subscriptions => subscriptions.where({ status: "Success" }).max("endDate"))
                .orderBy([user => user.createdAt.desc(), user => user.id.desc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingUsers(this.db.orm, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return {
            items: rows.map(row => ({ user: toUserRecord(row), lastSuccessEndDate: row.subscriptions })),
            total: totals.total,
        };
    } catch (cause) {
        throw new UsersRepositoryFailureError("list", cause);
    }
}
