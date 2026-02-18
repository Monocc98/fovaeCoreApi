import { Router } from 'express';
import multer from 'multer';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { MovementService } from '../services/movement.service';
import { MovementController } from './controller';




export class MovementsRoutes {


  static get routes(): Router {

    const router = Router();
    const movementService = new MovementService();
    const controller = new MovementController( movementService );

    const upload = multer({ storage: multer.memoryStorage() });
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getMovements);
    router.get('/account/:idAccount', controller.getMovementsByAccountId);
    router.get('/:idMovement', controller.getMovementById);

    // router.put('/:idMovement', controller.updateMovement);

    router.post('/', controller.createMovement);
    router.put('/:idMovement', controller.updateMovement);
    router.delete('/:idMovement', controller.deleteMovement);

    router.get('/importBatches/pending/:idAccount', controller.getPendingImportBatchesByAccount);
    router.get('/importBatches/summary/:idBatch', controller.getImportBatchSummary);

    // ====== NUEVO: importación desde Solución Factible ======

    // 1) Subir archivo y obtener resumen de conceptos
    router.post(
      '/imports/solucion-factible',
      upload.single('file'),
      controller.uploadSolucionFactible
    );

    // 2) Confirmar clasificación y crear movimientos
    router.post(
      '/imports/solucion-factible/:batchId/confirm',
      controller.confirmSolucionFactible
    );

    // ServoEscolar
    router.post(
      "/imports/servo-escolar",
      upload.single("file"),
      controller.uploadServoEscolar
    );

    return router;
  }


}

