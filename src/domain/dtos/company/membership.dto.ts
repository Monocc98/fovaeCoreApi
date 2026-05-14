

import { Validators } from "../../../config";


export class CreateMembershipDto {
    // Se manda como userId ya que al estar usando el token y guardar en el body el user hay conflicto al momento de intentar
    // crearlo con ese mismo nombre, por eso se cambia a userId. En auth.middleware esta el conflicto
    private constructor(
        public readonly user: string,
        public readonly company: string,
        public readonly role: string,
        public readonly status: string,
        public readonly dividendShare: number,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateMembershipDto?] {

        const { user, company, role, status, dividendShare = 0 } = object;
        const normalizedDividendShare = Number(dividendShare);
        
        if ( !user ) return ['Missing User'];
        if ( !company ) return ['Missing Company'];
        if ( !Validators.isMongoID(user) ) return ['Invalid User ID'];
        if ( !Validators.isMongoID(company) ) return ['Invalid Company ID'];
        if ( !Number.isFinite(normalizedDividendShare) || normalizedDividendShare < 0 || normalizedDividendShare > 100 ) {
            return ['Invalid dividend share'];
        }
        
        return [undefined,  new CreateMembershipDto( user, company, role, status, normalizedDividendShare )]

    }
}
