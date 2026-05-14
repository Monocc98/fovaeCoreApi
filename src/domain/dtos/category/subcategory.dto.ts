import { Validators } from "../../../config";


export class CreateSubcategoryDto {

    private constructor(
        public readonly name : string,
        public readonly scope : string,
        public readonly parent : string,
        public readonly company : string,
        public readonly account : string,
        public readonly assignedUser?: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateSubcategoryDto?] {

        const { name, scope, parent, company, account, assignedUser } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing company'];
        if ( !scope ) return ['Missing scope'];
        if ( scope === 'ACCOUNT' && !account ) return ['Missing account'];
        if ( !Validators.isMongoID(company) ) return ['Invalid company ID'];
        if ( !Validators.isMongoID(parent) ) return ['Invalid parent ID'];
        if (  scope === 'ACCOUNT' && !Validators.isMongoID(account) ) return ['Invalid account ID'];
        if ( assignedUser && !Validators.isMongoID(assignedUser) ) return ['Invalid assigned user ID'];
        
        return [undefined,  new CreateSubcategoryDto( name, scope, parent, company, account, assignedUser || undefined )]

    }
}

export class UpdateSubcategoryDto {

    private constructor(
        public readonly name : string,
        public readonly assignedUser?: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateSubcategoryDto?] {

        const { name, assignedUser } = object;
        
        if ( !name ) return ['Missing name'];
        if ( assignedUser && !Validators.isMongoID(assignedUser) ) return ['Invalid assigned user ID'];
        
        return [undefined,  new UpdateSubcategoryDto( name, assignedUser || undefined )]

    }
}
