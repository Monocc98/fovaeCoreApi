import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { MembershipService } from '../services';
import { MembershipController } from './controller';




export class MembershipRoutes {


  static get routes(): Router {

    const router = Router();
    const membershipService = new MembershipService();
    const controller = new MembershipController( membershipService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getmemberships);
    router.post('/', controller.createMembership);



    return router;
  }


}

