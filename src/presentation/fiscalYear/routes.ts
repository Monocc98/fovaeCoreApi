import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { FiscalYearService } from '../services/fiscalYear.service';
import { FiscalYearController } from './controller';




export class FiscalYearRoutes {


  static get routes(): Router {

    const router = Router();
    const fiscalYearService = new FiscalYearService();
    const controller = new FiscalYearController( fiscalYearService );
    
    // Definir las rutas
    router.get('/', controller.getFiscalYears);
    router.get('/company/:idCompany', controller.getFiscalYearsByCompanyId);
    router.get('/:idFiscalYear', controller.getFiscalYearById);

    // router.put('/:idFiscalYear', controller.updateFiscalYear);

    // router.post('/', [ AuthMiddleware.validateJWT ], controller.createFiscalYear);
    router.post('/', controller.createFiscalYear);
    router.put('/:idFiscalYear', controller.updateFiscalYear);
    router.delete('/:idFiscalYear', controller.deleteFiscalYear);



    return router;
  }


}

