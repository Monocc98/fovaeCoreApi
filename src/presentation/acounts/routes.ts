import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { AccountService } from '../services/account.service';
import { AccountsController } from './controller';




export class AccountsRoutes {


  static get routes(): Router {

    const router = Router();
    const accountService = new AccountService();
    const controller = new AccountsController( accountService );
    
    // Definir las rutas
    router.get('/', controller.getAccounts);
    router.post('/', [ AuthMiddleware.validateJWT ], controller.createAccount);



    return router;
  }


}

