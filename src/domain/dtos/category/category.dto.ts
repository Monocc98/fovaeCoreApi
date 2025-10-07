import { Validators } from "../../../config";


export class CreateCategoryDto {

    private constructor(
        public readonly name : string,
        public readonly company : string,
        public readonly scope : string,
        public readonly account : string,
        public readonly type : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateCategoryDto?] {

        const { name, company, scope, account, type } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing company'];
        if ( !scope ) return ['Missing scope'];
        if ( scope === 'ACCOUNT' && !account ) return ['Missing account'];
        if ( !type ) return ['Missing type'];
        if ( !Validators.isMongoID(company) ) return ['Invalid company ID'];
        if (  scope === 'ACCOUNT' && !Validators.isMongoID(account) ) return ['Invalid account ID'];
        
        return [undefined,  new CreateCategoryDto( name, company, scope, account, type )]

    }
}

export class UpdateCategoryDto {

    private constructor(
        public readonly name : string,
        public readonly type : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateCategoryDto?] {

        const { name, type } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !type ) return ['Missing type'];
        
        return [undefined,  new UpdateCategoryDto( name, type )]

    }
}