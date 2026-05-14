import { Request, Response } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CustomError } from "../../domain";
import { CreateTransferDto } from "../../domain/dtos/transfer/transfer.dto";
import { TransferService } from "../services/transfer.service";

export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

  createTransfer = async (req: Request, res: Response) => {
    const [error, dto] = CreateTransferDto.create(req.body);
    if (error) return sendValidationError(res, error);

    this.transferService
      .createTransfer(dto!)
      .then((result) => res.status(201).json(result))
      .catch((serviceError) => this.handleError(serviceError, res));
  };

  getTransfersByCompany = async (req: Request, res: Response) => {
    const idCompany = req.params.idCompany;

    this.transferService
      .getTransfersByCompany(idCompany)
      .then((result) => res.json(result))
      .catch((serviceError) => this.handleError(serviceError, res));
  };

  getTransferById = async (req: Request, res: Response) => {
    const idTransfer = req.params.idTransfer;

    this.transferService
      .getTransferById(idTransfer)
      .then((result) => res.json(result))
      .catch((serviceError) => this.handleError(serviceError, res));
  };
}


