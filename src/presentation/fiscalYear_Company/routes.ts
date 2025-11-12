import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { FiscalYear_CompanyController } from './controller';
import { FiscalYear_CompanyService } from '../services/fiscalYear_Company.service';




export class FiscalYear_CompanyRoutes {


  static get routes(): Router {

    const router = Router();
    const service = new FiscalYear_CompanyService();
    const controller = new FiscalYear_CompanyController( service );
    
    // Definir las rutas
    router.get('/', controller.getFiscalYears_Companies);
    router.post('/', controller.createFiscalYear_Company); //[ AuthMiddleware.validateJWT ]



    return router;
  }


}

