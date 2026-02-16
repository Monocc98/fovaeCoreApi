import mongoose from "mongoose";
import { Validators } from "../../config";
import {
  AccountModel,
  CompanyModel,
  MovementModel,
  TransferModel,
} from "../../data";
import { CreateTransferDto, CustomError } from "../../domain";

export class TransferService {
  constructor() {}

  async createTransfer(createTransferDto: CreateTransferDto) {
    const companyId = Validators.convertToUid(createTransferDto.company);
    const fromAccountId = Validators.convertToUid(createTransferDto.fromAccount);
    const toAccountId = Validators.convertToUid(createTransferDto.toAccount);
    const subsubcategoryId = Validators.convertToUid(
      createTransferDto.subsubcategory
    );

    const company = await CompanyModel.findById(companyId).lean();
    if (!company) throw CustomError.notFound("Company not found");

    const fromAccount = await AccountModel.findById(fromAccountId).lean();
    const toAccount = await AccountModel.findById(toAccountId).lean();

    if (!fromAccount) throw CustomError.notFound("fromAccount not found");
    if (!toAccount) throw CustomError.notFound("toAccount not found");

    if (String(fromAccount.company) !== createTransferDto.company) {
      throw CustomError.badRequest("fromAccount does not belong to company");
    }

    if (String(toAccount.company) !== createTransferDto.company) {
      throw CustomError.badRequest("toAccount does not belong to company");
    }

    if (createTransferDto.idempotencyKey) {
      const existingTransfer = await TransferModel.findOne({
        company: companyId,
        idempotencyKey: createTransferDto.idempotencyKey,
      })
        .populate("company fromAccount toAccount")
        .lean();

      if (existingTransfer) {
        const movements = await MovementModel.find({
          transfer: existingTransfer._id,
        })
          .sort({ transferDirection: 1 })
          .lean();

        return {
          transfer: existingTransfer,
          movements,
          idempotentReplay: true,
        };
      }
    }

    const session = await mongoose.startSession();
    try {
      let createdTransfer: any = null;
      let createdMovements: any[] = [];

      await session.withTransaction(async () => {
        const transferDocs = await TransferModel.create(
          [
            {
              company: companyId,
              fromAccount: fromAccountId,
              toAccount: toAccountId,
              amount: createTransferDto.amount,
              currency: createTransferDto.currency,
              occurredAt: createTransferDto.occurredAt,
              recordedAt: new Date(),
              description: createTransferDto.description,
              comments: createTransferDto.comments,
              transfererId: createTransferDto.transfererId,
              idempotencyKey: createTransferDto.idempotencyKey,
              status: "COMPLETED",
            },
          ],
          { session }
        );

        const transfer = transferDocs[0];
        if (!transfer) {
          throw CustomError.internalServer("Transfer creation failed");
        }

        const movementDocs = await MovementModel.create(
          [
            {
              description: createTransferDto.description,
              comments: createTransferDto.comments,
              account: fromAccountId,
              counterpartyAccount: toAccountId,
              occurredAt: createTransferDto.occurredAt,
              recordedAt: new Date(),
              amount: -Math.abs(createTransferDto.amount),
              source: "TRANSFER",
              subsubcategory: subsubcategoryId,
              transfererId: createTransferDto.transfererId,
              transfer: transfer._id,
              transferDirection: "OUT",
              tags: [],
            },
            {
              description: createTransferDto.description,
              comments: createTransferDto.comments,
              account: toAccountId,
              counterpartyAccount: fromAccountId,
              occurredAt: createTransferDto.occurredAt,
              recordedAt: new Date(),
              amount: Math.abs(createTransferDto.amount),
              source: "TRANSFER",
              subsubcategory: subsubcategoryId,
              transfererId: createTransferDto.transfererId,
              transfer: transfer._id,
              transferDirection: "IN",
              tags: [],
            },
          ],
          { session }
        );

        createdTransfer = transfer;
        createdMovements = movementDocs;
      });

      return {
        transfer: createdTransfer,
        movements: createdMovements,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer(`${error}`);
    } finally {
      await session.endSession();
    }
  }

  async getTransfersByCompany(idCompany: string) {
    try {
      if (!Validators.isMongoID(idCompany)) {
        throw CustomError.badRequest("Invalid company ID");
      }

      const companyId = Validators.convertToUid(idCompany);
      const transfers = await TransferModel.find({ company: companyId })
        .sort({ occurredAt: -1, recordedAt: -1 })
        .populate("fromAccount toAccount")
        .lean();

      return { transfers };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer(`${error}`);
    }
  }

  async getTransferById(idTransfer: string) {
    try {
      if (!Validators.isMongoID(idTransfer)) {
        throw CustomError.badRequest("Invalid transfer ID");
      }

      const transferId = Validators.convertToUid(idTransfer);
      const transfer = await TransferModel.findById(transferId)
        .populate("company fromAccount toAccount")
        .lean();

      if (!transfer) {
        throw CustomError.notFound("Transfer not found");
      }

      const movements = await MovementModel.find({
        transfer: transferId,
      })
        .sort({ transferDirection: 1 })
        .populate("account counterpartyAccount")
        .lean();

      return { transfer, movements };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer(`${error}`);
    }
  }
}
