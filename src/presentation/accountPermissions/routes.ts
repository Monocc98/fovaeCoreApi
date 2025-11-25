import { Router } from 'express';
import { AccountPermissionsController } from './controller';
import { AccountPermissionsService } from '../services/accountPermissions.service';
// import { AuthMiddleware } from '../middlewares/auth.middleware';




export class AccountPermissionsRoutes {


  static get routes(): Router {

    const router = Router();
    const service = new AccountPermissionsService();
    const controller = new AccountPermissionsController( service );
    
    // Definir las rutas
    router.get('/', controller.getAccountPermissions);
    router.post('/', controller.createAccountPermissions); //[ AuthMiddleware.validateJWT ], 



    return router;
  }


}

