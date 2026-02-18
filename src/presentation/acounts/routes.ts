import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { AccountService } from '../services/account.service';
import { AccountsController } from './controller';




export class AccountsRoutes {


  static get routes(): Router {

    const router = Router();
    const accountService = new AccountService();
    const controller = new AccountsController( accountService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getAccounts);
    router.get('/:idCompany', controller.getAccountsByIdCompany);
    
    router.post('/', controller.createAccount);
    router.put('/:idAccount', controller.updateAccount);
    router.delete('/:idAccount', controller.deleteAccount);

    return router;
  }


}

