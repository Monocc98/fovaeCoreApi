import { Validators } from "../../../config";

export class ImportSolucionFactibleDto {

  private constructor(
    public readonly accountId: string,
    public readonly investmentAccountId?: string,
  ) {}

  static create(object: { [key: string]: any }): [string?, ImportSolucionFactibleDto?] {
    const { accountId, investmentAccountId } = object;

    if (!accountId) return ['Missing accountId'];
    if (!Validators.isMongoID(accountId)) return ['Invalid accountId'];
    if (investmentAccountId && !Validators.isMongoID(investmentAccountId)) {
      return ['Invalid investmentAccountId'];
    }

    return [undefined, new ImportSolucionFactibleDto(accountId, investmentAccountId)];
  }
}
