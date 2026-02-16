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

  private mapTransferView(transfer: any) {
    const fromAccountName =
      typeof transfer?.fromAccount === "object" && transfer?.fromAccount
        ? String((transfer.fromAccount as any).name ?? "")
        : "";
    const toAccountName =
      typeof transfer?.toAccount === "object" && transfer?.toAccount
        ? String((transfer.toAccount as any).name ?? "")
        : "";

    return {
      ...transfer,
      fromAccountName,
      toAccountName,
    };
  }

  private isTransactionNotSupportedError(error: unknown): boolean {
    return String(error).includes(
      "Transaction numbers are only allowed on a replica set member or mongos"
    );
  }

  private async createTransferWithMovements(params: {
    companyId: mongoose.Types.ObjectId;
    fromAccountId: mongoose.Types.ObjectId;
    toAccountId: mongoose.Types.ObjectId;
    createTransferDto: CreateTransferDto;
    fromAccountName: string;
    toAccountName: string;
    movementComments: string;
    session?: mongoose.ClientSession;
  }) {
    const transferPayload = {
      company: params.companyId,
      fromAccount: params.fromAccountId,
      toAccount: params.toAccountId,
      amount: params.createTransferDto.amount,
      currency: params.createTransferDto.currency,
      occurredAt: params.createTransferDto.occurredAt,
      recordedAt: new Date(),
      description: params.createTransferDto.description,
      comments: params.createTransferDto.comments,
      transfererId: params.createTransferDto.transfererId,
      idempotencyKey: params.createTransferDto.idempotencyKey,
      status: "COMPLETED",
    };

    const movementPayloadBase = {
      comments: params.movementComments,
      occurredAt: params.createTransferDto.occurredAt,
      recordedAt: new Date(),
      source: "TRANSFER",
      transfererId: params.createTransferDto.transfererId,
      tags: [],
    };

    if (params.session) {
      const transferDocs = await TransferModel.create([transferPayload], {
        session: params.session,
      });
      const transfer = transferDocs[0];
      if (!transfer) {
        throw CustomError.internalServer("Transfer creation failed");
      }

      const movementDocs = await MovementModel.create(
        [
          {
            ...movementPayloadBase,
            description: `Transferencia a ${params.toAccountName}`,
            account: params.fromAccountId,
            counterpartyAccount: params.toAccountId,
            amount: -Math.abs(params.createTransferDto.amount),
            transfer: transfer._id,
            transferDirection: "OUT",
          },
          {
            ...movementPayloadBase,
            description: `Transferencia de ${params.fromAccountName}`,
            account: params.toAccountId,
            counterpartyAccount: params.fromAccountId,
            amount: Math.abs(params.createTransferDto.amount),
            transfer: transfer._id,
            transferDirection: "IN",
          },
        ],
        { session: params.session }
      );

      return { transfer, movements: movementDocs };
    }

    const transfer = await TransferModel.create(transferPayload);

    try {
      const movements = await MovementModel.create([
        {
          ...movementPayloadBase,
          description: `Transferencia a ${params.toAccountName}`,
          account: params.fromAccountId,
          counterpartyAccount: params.toAccountId,
          amount: -Math.abs(params.createTransferDto.amount),
          transfer: transfer._id,
          transferDirection: "OUT",
        },
        {
          ...movementPayloadBase,
          description: `Transferencia de ${params.fromAccountName}`,
          account: params.toAccountId,
          counterpartyAccount: params.fromAccountId,
          amount: Math.abs(params.createTransferDto.amount),
          transfer: transfer._id,
          transferDirection: "IN",
        },
      ]);

      return { transfer, movements };
    } catch (error) {
      await MovementModel.deleteMany({ transfer: transfer._id });
      await TransferModel.findByIdAndDelete(transfer._id);
      throw error;
    }
  }

  async createTransfer(createTransferDto: CreateTransferDto) {
    const fromAccountId = Validators.convertToUid(createTransferDto.fromAccount);
    const toAccountId = Validators.convertToUid(createTransferDto.toAccount);

    const fromAccount = await AccountModel.findById(fromAccountId).lean();
    const toAccount = await AccountModel.findById(toAccountId).lean();

    if (!fromAccount) throw CustomError.notFound("fromAccount not found");
    if (!toAccount) throw CustomError.notFound("toAccount not found");

    const fromAccountName = String((fromAccount as any).name ?? createTransferDto.fromAccount);
    const toAccountName = String((toAccount as any).name ?? createTransferDto.toAccount);
    const normalizedDescription = String(createTransferDto.description ?? "").trim();
    const movementComments = createTransferDto.comments
      ? `${normalizedDescription}\n${createTransferDto.comments}`
      : normalizedDescription;

    const inferredCompanyId = String(fromAccount.company);
    if (String(toAccount.company) !== inferredCompanyId) {
      throw CustomError.badRequest("Accounts belong to different companies");
    }

    if (createTransferDto.company && createTransferDto.company !== inferredCompanyId) {
      throw CustomError.badRequest(
        "company does not match the company of the provided accounts"
      );
    }

    const companyId = Validators.convertToUid(inferredCompanyId);
    const company = await CompanyModel.findById(companyId).lean();
    if (!company) {
      throw CustomError.notFound("Company not found");
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
          transfer: this.mapTransferView(existingTransfer),
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
        const result = await this.createTransferWithMovements({
          companyId,
          fromAccountId,
          toAccountId,
          createTransferDto,
          fromAccountName,
          toAccountName,
          movementComments,
          session,
        });

        createdTransfer = result.transfer;
        createdMovements = result.movements;
      });

      return {
        transfer: {
          ...createdTransfer?.toJSON?.() ?? createdTransfer,
          fromAccountName,
          toAccountName,
        },
        movements: createdMovements,
      };
    } catch (error) {
      if (this.isTransactionNotSupportedError(error)) {
        const fallbackResult = await this.createTransferWithMovements({
          companyId,
          fromAccountId,
          toAccountId,
          createTransferDto,
          fromAccountName,
          toAccountName,
          movementComments,
        });

        return {
          transfer: {
            ...fallbackResult.transfer?.toJSON?.() ?? fallbackResult.transfer,
            fromAccountName,
            toAccountName,
          },
          movements: fallbackResult.movements,
          transactionFallback: true,
        };
      }

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
      const transfers: any[] = await TransferModel.find({ company: companyId })
        .sort({ occurredAt: -1, recordedAt: -1 })
        .populate("fromAccount toAccount")
        .lean();

      return { transfers: transfers.map((transfer) => this.mapTransferView(transfer)) };
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

      return { transfer: this.mapTransferView(transfer), movements };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer(`${error}`);
    }
  }
}
