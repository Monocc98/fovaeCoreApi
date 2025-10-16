import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { BudgetService } from '../services/budget.service';
import { BudgetController } from './controller';




export class BudgetRoutes {


  static get routes(): Router {

    const router = Router();
    const budgetService = new BudgetService();
    const controller = new BudgetController( budgetService );
    
    // Definir las rutas
    router.get('/', controller.getBudgets);
    router.get('/account/:idAccount', controller.getBudgetsByAccountId);
    router.get('/:idBudget', controller.getBudgetById);


    // router.post('/', [ AuthMiddleware.validateJWT ], controller.createMovement);
    router.post('/', controller.createBudget);
    router.put('/:idBudget', controller.updateBudget);
    router.delete('/:idBudget', controller.deleteBudget);



    return router;
  }


}

