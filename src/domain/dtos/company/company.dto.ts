import { Validators } from "../../../config";

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
const ZIP_CODE_REGEX = /^\d{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CreateCompanyDto {

    private constructor(
        public readonly name: string,
        public readonly group: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateCompanyDto?] {

        const { name, group } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !group ) return ['Missing group'];
        if ( !Validators.isMongoID(group) ) return ['Invalid Group ID'];
        
        return [undefined,  new CreateCompanyDto( name, group )]

    }
}

type FiscalEnvironment = "TEST" | "PRODUCTION";

type CompanyFiscalProfileInput = {
    rfc?: unknown;
    legalName?: unknown;
    taxRegime?: unknown;
    fiscalZipCode?: unknown;
    fiscalEmail?: unknown;
    defaultSeries?: unknown;
    nextFolio?: unknown;
    fiscalEnvironment?: unknown;
    pacProvider?: unknown;
};

export class UpdateCompanyFiscalProfileDto {
    private constructor(
        public readonly rfc: string,
        public readonly legalName: string,
        public readonly taxRegime: string,
        public readonly fiscalZipCode: string,
        public readonly fiscalEmail: string,
        public readonly defaultSeries: string,
        public readonly nextFolio: number,
        public readonly fiscalEnvironment: FiscalEnvironment,
        public readonly pacProvider: string,
    ) {}

    static create(object: CompanyFiscalProfileInput): [string?, UpdateCompanyFiscalProfileDto?] {
        const rfc = String(object.rfc ?? "").trim().toUpperCase();
        const legalName = String(object.legalName ?? "").trim();
        const taxRegime = String(object.taxRegime ?? "").trim();
        const fiscalZipCode = String(object.fiscalZipCode ?? "").trim();
        const fiscalEmail = String(object.fiscalEmail ?? "").trim().toLowerCase();
        const defaultSeries = String(object.defaultSeries ?? "").trim().toUpperCase();
        const pacProvider = String(object.pacProvider ?? "").trim();
        const rawNextFolio = Number(object.nextFolio ?? 1);
        const fiscalEnvironment = String(object.fiscalEnvironment ?? "TEST").trim().toUpperCase() as FiscalEnvironment;

        if (!rfc) return ["Missing rfc"];
        if (!RFC_REGEX.test(rfc)) return ["Invalid rfc"];
        if (!legalName) return ["Missing legalName"];
        if (!taxRegime) return ["Missing taxRegime"];
        if (!fiscalZipCode) return ["Missing fiscalZipCode"];
        if (!ZIP_CODE_REGEX.test(fiscalZipCode)) return ["Invalid fiscalZipCode"];
        if (fiscalEmail && !EMAIL_REGEX.test(fiscalEmail)) return ["Invalid fiscalEmail"];
        if (!Number.isInteger(rawNextFolio) || rawNextFolio < 1) return ["Invalid nextFolio"];
        if (!["TEST", "PRODUCTION"].includes(fiscalEnvironment)) return ["Invalid fiscalEnvironment"];

        return [
            undefined,
            new UpdateCompanyFiscalProfileDto(
                rfc,
                legalName,
                taxRegime,
                fiscalZipCode,
                fiscalEmail,
                defaultSeries,
                rawNextFolio,
                fiscalEnvironment,
                pacProvider,
            )
        ];
    }
}
