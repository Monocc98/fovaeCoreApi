import { Validators } from "../../../config";


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