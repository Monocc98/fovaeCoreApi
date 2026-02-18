import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { CompanyController } from './controller';
import { CompanyService } from '../services/company.service';




export class CompanyRoutes {


  static get routes(): Router {

    const router = Router();
    const companyService = new CompanyService();
    const controller = new CompanyController( companyService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getCompanies);
    router.post('/', controller.createCompany);



    return router;
  }


}

