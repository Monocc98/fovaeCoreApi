import { Router } from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { SuperAdminMiddleware } from "../middlewares/super-admin.middleware";
import { AdminUsersController } from "./controller";
import { AdminUsersService } from "../services/adminUsers.service";

export class AdminUsersRoutes {

  static get routes(): Router {

    const router = Router();
    const service = new AdminUsersService();
    const controller = new AdminUsersController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(SuperAdminMiddleware.requireSuperAdmin);

    router.get('/', controller.listUsers);
    router.get('/:id/permissions', controller.getUserPermissions);
    router.put('/:id/permissions', controller.updateUserPermissions);
    router.patch('/:id/deactivate', controller.deactivateUser);
    router.get('/:id', controller.getUserById);
    router.post('/', controller.createUser);
    router.patch('/:id', controller.updateUser);

    return router;
  }
}
