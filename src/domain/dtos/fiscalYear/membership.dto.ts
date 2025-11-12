

import { Validators } from "../../../config";


export class CreateFiscalYear_CompanyDto {
    // Se manda como userId ya que al estar usando el token y guardar en el body el user hay conflicto al momento de intentar
    // crearlo con ese mismo nombre, por eso se cambia a userId. En auth.middleware esta el conflicto
    private constructor(
        public readonly user: string,
        public readonly company: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateFiscalYear_CompanyDto?] {

        const { company, fiscalYear } = object;
        
        if ( !company ) return ['Missing Company'];
        if ( !fiscalYear ) return ['Missing FiscalYear'];
        if ( !Validators.isMongoID(company) ) return ['Invalid Company ID'];
        if ( !Validators.isMongoID(fiscalYear) ) return ['Invalid FiscalYear ID'];
        
        return [undefined,  new CreateFiscalYear_CompanyDto( company, fiscalYear )]

    }
}