import { Validators } from "../../../config";

export class ImportSolucionFactibleDto {

  private constructor(
    public readonly accountId: string,
    public readonly investmentAccountId?: string,
    public readonly accountMappings?: Record<string, string>,
  ) {}

  static create(object: { [key: string]: any }): [string?, ImportSolucionFactibleDto?] {
    const { accountId, investmentAccountId } = object;

    if (!accountId) return ['Missing accountId'];
    if (!Validators.isMongoID(accountId)) return ['Invalid accountId'];
    if (investmentAccountId && !Validators.isMongoID(investmentAccountId)) {
      return ['Invalid investmentAccountId'];
    }

    let accountMappings: Record<string, string> | undefined;
    const rawMappings = object.accountMappings ?? object.accountMap;
    if (rawMappings !== undefined && rawMappings !== null && rawMappings !== '') {
      try {
        const parsedMappings =
          typeof rawMappings === 'string' ? JSON.parse(rawMappings) : rawMappings;

        if (Array.isArray(parsedMappings)) {
          accountMappings = {};
          for (const item of parsedMappings) {
            const label = String(item?.label ?? item?.sourceAccountLabel ?? item?.section ?? '').trim();
            const mappedAccountId = String(item?.accountId ?? item?.account ?? '').trim();
            if (!label) return ['Invalid accountMappings label'];
            if (!Validators.isMongoID(mappedAccountId)) return ['Invalid accountMappings accountId'];
            accountMappings[label] = mappedAccountId;
          }
        } else if (typeof parsedMappings === 'object') {
          accountMappings = {};
          for (const [label, mappedAccountId] of Object.entries(parsedMappings)) {
            const cleanLabel = String(label ?? '').trim();
            const cleanAccountId = String(mappedAccountId ?? '').trim();
            if (!cleanLabel) return ['Invalid accountMappings label'];
            if (!Validators.isMongoID(cleanAccountId)) return ['Invalid accountMappings accountId'];
            accountMappings[cleanLabel] = cleanAccountId;
          }
        } else {
          return ['Invalid accountMappings'];
        }
      } catch {
        return ['Invalid accountMappings JSON'];
      }
    }

    return [
      undefined,
      new ImportSolucionFactibleDto(accountId, investmentAccountId, accountMappings),
    ];
  }
}
