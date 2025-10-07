import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { MovementService } from '../services/movement.service';
import { MovementController } from './controller';




export class MovementsRoutes {


  static get routes(): Router {

    const router = Router();
    const movementService = new MovementService();
    const controller = new MovementController( movementService );
    
    // Definir las rutas
    router.get('/', controller.getMovements);
    router.get('/account/:idAccount', controller.getMovementsByAccountId);
    router.get('/:idMovement', controller.getMovementById);

    // router.put('/:idMovement', controller.updateMovement);

    // router.post('/', [ AuthMiddleware.validateJWT ], controller.createMovement);
    router.post('/', controller.createMovement);
    router.put('/:idMovement', controller.updateMovement);
    router.delete('/:idMovement', controller.deleteMovement);



    return router;
  }


}

