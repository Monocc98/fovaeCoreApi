import { Validators } from "../../../config";

export class CreateTransferDto {
  private constructor(
    public readonly company: string,
    public readonly fromAccount: string,
    public readonly toAccount: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly occurredAt: Date,
    public readonly description: string,
    public readonly subsubcategory: string,
    public readonly comments?: string,
    public readonly transfererId?: string,
    public readonly idempotencyKey?: string
  ) {}

  static create(object: { [key: string]: any }): [string?, CreateTransferDto?] {
    const {
      company,
      fromAccount,
      toAccount,
      amount,
      currency,
      occurredAt,
      description,
      subsubcategory,
      comments,
      transfererId,
      idempotencyKey,
    } = object;

    if (!company) return ["Missing company"];
    if (!fromAccount) return ["Missing fromAccount"];
    if (!toAccount) return ["Missing toAccount"];
    if (amount === undefined || amount === null) return ["Missing amount"];
    if (!occurredAt) return ["Missing occurredAt"];
    if (!description) return ["Missing description"];
    if (!subsubcategory) return ["Missing subsubcategory"];

    if (!Validators.isMongoID(company)) return ["Invalid company ID"];
    if (!Validators.isMongoID(fromAccount)) return ["Invalid fromAccount ID"];
    if (!Validators.isMongoID(toAccount)) return ["Invalid toAccount ID"];
    if (!Validators.isMongoID(subsubcategory))
      return ["Invalid subsubcategory ID"];

    if (fromAccount === toAccount) {
      return ["fromAccount and toAccount must be different"];
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount)) return ["Invalid amount"];
    if (parsedAmount <= 0) return ["Amount must be greater than 0"];

    const occurredDate = new Date(occurredAt);
    if (Number.isNaN(occurredDate.getTime())) return ["Invalid occurredAt date"];

    const parsedCurrency = String(currency || "MXN")
      .trim()
      .toUpperCase();
    if (!parsedCurrency) return ["Invalid currency"];

    return [
      undefined,
      new CreateTransferDto(
        company,
        fromAccount,
        toAccount,
        parsedAmount,
        parsedCurrency,
        occurredDate,
        String(description),
        subsubcategory,
        comments ? String(comments) : undefined,
        transfererId ? String(transfererId) : undefined,
        idempotencyKey ? String(idempotencyKey) : undefined
      ),
    ];
  }
}
