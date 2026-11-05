import type { UsersService } from "../service/users.service.js";
import { changeMyPassword } from "./change-my-password.js";
import { createUser } from "./create-user.js";
import { getMe } from "./get-me.js";
import { getUser } from "./get-user.js";
import { listUsers } from "./list-users.js";
import { updateMe } from "./update-me.js";
import { updateUser } from "./update-user.js";

export class UsersController {
    constructor(readonly usersService: UsersService) {}

    getMe = getMe.bind(this);
    updateMe = updateMe.bind(this);
    changeMyPassword = changeMyPassword.bind(this);
    listUsers = listUsers.bind(this);
    createUser = createUser.bind(this);
    getUser = getUser.bind(this);
    updateUser = updateUser.bind(this);
}
