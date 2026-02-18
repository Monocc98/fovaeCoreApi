import { Router } from 'express';
import { GroupController } from './controller';
import { GroupService } from '../services';
import { AuthMiddleware } from '../middlewares/auth.middleware';




export class GroupRoutes {


  static get routes(): Router {

    const router = Router();
    const groupService = new GroupService();
    const controller = new GroupController( groupService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getGroup);
    router.post('/', controller.createGroup);



    return router;
  }


}

