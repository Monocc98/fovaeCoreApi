import { Router } from "express";
import { HomeService } from "../services/home.service";
import { HomeController } from "./controller";

export class HomeRoutes {


  static get routes(): Router {

    const router = Router();
    const homeService = new HomeService();
    const controller = new HomeController( homeService );
    
    // Definir las rutas
    router.get('/', controller.getHomeOverview);
    // router.post('/', [ AuthMiddleware.validateJWT ], controller.createGroup);



    return router;
  }


}

