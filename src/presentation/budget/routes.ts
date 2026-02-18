import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { BudgetService } from '../services/budget.service';
import { BudgetController } from './controller';




export class BudgetRoutes {


  static get routes(): Router {

    const router = Router();
    const budgetService = new BudgetService();
    const controller = new BudgetController( budgetService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getBudgets);
    router.get('/company/:idCompany', controller.getBudgetsByCompanyId);
    router.get('/:idBudget', controller.getBudgetById);


    router.post('/', controller.createBudget);
    router.put('/:idBudget', controller.updateBudget);
    router.delete('/:idBudget', controller.deleteBudget);



    return router;
  }


}

