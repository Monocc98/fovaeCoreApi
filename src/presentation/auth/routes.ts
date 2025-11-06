import { Router } from 'express';
import { AuthController } from './controller';
import { AuthService } from '../services';
import { envs } from '../../config';
import { AuthMiddleware } from '../middlewares/auth.middleware';




export class AuthRoutes {


  static get routes(): Router {

    const router = Router();
    const authService = new AuthService();

    const controller = new AuthController( authService );
    
    // Definir las rutas
    router.post('/login', controller.loginUser);
    router.post('/register', controller.registerUser);
    
    router.post('/renew', AuthMiddleware.validateJWT ,controller.renewToken);
    
    return router;
  }


}

