import { Validators } from "../../../config";


export class CreateAccountDto {

    private constructor(
        public readonly name: string,
        public readonly company: string,
        public readonly type: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateAccountDto?] {

        const { name, company, type } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing group'];
        if ( !type ) return ['Missing type'];
        if ( !Validators.isMongoID(company) ) return ['Invalid Group ID'];
        
        return [undefined,  new CreateAccountDto( name, company, type )]

    }
}