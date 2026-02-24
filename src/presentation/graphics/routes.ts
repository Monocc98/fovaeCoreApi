import { Router } from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { GraphicsController } from "./controller";
import { GraphicsService } from "../services/graphics.service";

export class GraphicsRoutes {
  static get routes(): Router {
    const router = Router();
    const graphicsService = new GraphicsService();
    const controller = new GraphicsController(graphicsService);

    router.use(AuthMiddleware.validateJWT);
    router.get("/expense-budget-tree/:idCompany", controller.getExpenseBudgetTreeByMonth);

    return router;
  }
}
