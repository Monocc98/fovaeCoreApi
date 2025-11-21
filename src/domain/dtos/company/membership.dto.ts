

import { Validators } from "../../../config";


export class CreateMembershipDto {
    // Se manda como userId ya que al estar usando el token y guardar en el body el user hay conflicto al momento de intentar
    // crearlo con ese mismo nombre, por eso se cambia a userId. En auth.middleware esta el conflicto
    private constructor(
        public readonly user: string,
        public readonly company: string,
        public readonly roles: string,
        public readonly status: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateMembershipDto?] {

        const { user, company, roles, status } = object;
        
        if ( !user ) return ['Missing User'];
        if ( !company ) return ['Missing Company'];
        if ( !Validators.isMongoID(user) ) return ['Invalid User ID'];
        if ( !Validators.isMongoID(company) ) return ['Invalid Company ID'];
        
        return [undefined,  new CreateMembershipDto( user, company, roles, status )]

    }
}