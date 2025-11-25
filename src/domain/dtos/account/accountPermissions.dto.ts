

import { Validators } from "../../../config";


export class CreateAccountPermissionsDto {
    // Se manda como userId ya que al estar usando el token y guardar en el body el user hay conflicto al momento de intentar
    // crearlo con ese mismo nombre, por eso se cambia a userId. En auth.middleware esta el conflicto
    private constructor(
        public readonly membership: string,
        public readonly account: string,
        public readonly canView: boolean,
        public readonly canEdit: boolean,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateAccountPermissionsDto?] {

        const { membership, account, canView, canEdit } = object;
        
        if ( !membership ) return ['Missing Membership'];
        if ( !account ) return ['Missing Account'];
        if ( !Validators.isMongoID(membership) ) return ['Invalid User ID'];
        if ( !Validators.isMongoID(account) ) return ['Invalid Company ID'];
        
        return [undefined,  new CreateAccountPermissionsDto( membership, account, canView, canEdit )]

    }
}