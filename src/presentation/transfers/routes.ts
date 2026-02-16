import { Router } from "express";
import { TransferController } from "./controller";
import { TransferService } from "../services/transfer.service";

export class TransfersRoutes {
  static get routes(): Router {
    const router = Router();
    const transferService = new TransferService();
    const controller = new TransferController(transferService);

    router.get("/company/:idCompany", controller.getTransfersByCompany);
    router.get("/:idTransfer", controller.getTransferById);
    router.post("/", controller.createTransfer);

    return router;
  }
}
