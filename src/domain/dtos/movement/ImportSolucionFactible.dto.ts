import { Validators } from "../../../config";

export class ImportSolucionFactibleDto {

  private constructor(
    public readonly accountId: string,
  ) {}

  static create(object: { [key: string]: any }): [string?, ImportSolucionFactibleDto?] {
    const { accountId } = object;

    if (!accountId) return ['Missing accountId'];
    if (!Validators.isMongoID(accountId)) return ['Invalid accountId'];

    return [undefined, new ImportSolucionFactibleDto(accountId)];
  }
}