import { Router } from "express";
import { HomeService } from "../services/home.service";
import { HomeController } from "./controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export class HomeRoutes {


  static get routes(): Router {

    const router = Router();
    const homeService = new HomeService();
    const controller = new HomeController( homeService );
    
    // Definir las rutas
    router.get('/', [ AuthMiddleware.validateJWT ], controller.getHomeOverview);
    router.get('/budget-vs-actual', [ AuthMiddleware.validateJWT ], controller.getCompanyBudgetVsActual);
    // router.post('/', [ AuthMiddleware.validateJWT ], controller.createGroup);



    return router;
  }


}

