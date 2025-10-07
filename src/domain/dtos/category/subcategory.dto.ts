import { Validators } from "../../../config";


export class CreateSubcategoryDto {

    private constructor(
        public readonly name : string,
        public readonly scope : string,
        public readonly parent : string,
        public readonly company : string,
        public readonly account : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateSubcategoryDto?] {

        const { name, scope, parent, company, account } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing company'];
        if ( !scope ) return ['Missing scope'];
        if ( scope === 'ACCOUNT' && !account ) return ['Missing account'];
        if ( !Validators.isMongoID(company) ) return ['Invalid company ID'];
        if ( !Validators.isMongoID(parent) ) return ['Invalid parent ID'];
        if (  scope === 'ACCOUNT' && !Validators.isMongoID(account) ) return ['Invalid account ID'];
        
        return [undefined,  new CreateSubcategoryDto( name, scope, parent, company, account )]

    }
}

export class UpdateSubcategoryDto {

    private constructor(
        public readonly name : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateSubcategoryDto?] {

        const { name } = object;
        
        if ( !name ) return ['Missing name'];
        
        return [undefined,  new UpdateSubcategoryDto( name )]

    }
}