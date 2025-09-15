import { Router } from 'express';
import { GroupController } from './controller';
import { GroupService } from '../services';
import { AuthMiddleware } from '../middlewares/auth.middleware';




export class GroupRoutes {


  static get routes(): Router {

    const router = Router();
    const groupService = new GroupService();
    const controller = new GroupController( groupService );
    
    // Definir las rutas
    router.get('/', controller.getGroup);
    router.post('/', [ AuthMiddleware.validateJWT ], controller.createGroup);



    return router;
  }


}

