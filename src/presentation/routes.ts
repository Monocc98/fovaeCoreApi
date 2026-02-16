import { Router } from 'express';
import { AuthRoutes } from './auth/routes';
import { GroupRoutes } from './group/routes';
import { CompanyRoutes } from './companies/routes';
import { MembershipRoutes } from './membership/routes';
import { HomeRoutes } from './home/routes';
import { AccountsRoutes } from './acounts/routes';
import { CategoriesRoutes } from './category/routes';
import { MovementsRoutes } from './movements/routes';
import { BudgetRoutes } from './budget/routes';
import { FiscalYearRoutes } from './fiscalYear/routes';
import { FiscalYear_CompanyRoutes } from './fiscalYear_Company/routes';
import { AccountPermissionsRoutes } from './accountPermissions/routes';
import { TransfersRoutes } from './transfers/routes';




export class AppRoutes {


  static get routes(): Router {

    const router = Router();
    
    // Definir las rutas
    router.use('/api/auth', AuthRoutes.routes );
    router.use('/api/groups', GroupRoutes.routes );
    router.use('/api/companies', CompanyRoutes.routes );
    router.use('/api/membership', MembershipRoutes.routes );
    router.use('/api/home', HomeRoutes.routes);
    router.use('/api/accounts', AccountsRoutes.routes);
    router.use('/api/categories', CategoriesRoutes.routes);
    router.use('/api/movements', MovementsRoutes.routes);
    router.use('/api/budgets', BudgetRoutes.routes);
    router.use('/api/fiscalYear', FiscalYearRoutes.routes);
    router.use('/api/fiscalYearCompany', FiscalYear_CompanyRoutes.routes);
    router.use('/api/accountPermissions', AccountPermissionsRoutes.routes);
    router.use('/api/transfers', TransfersRoutes.routes);

    return router;
  }


}
