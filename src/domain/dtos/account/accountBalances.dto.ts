import { Validators } from "../../../config";


export class CreateAccountBalanceDto {

    private constructor(
        public readonly _id: string,
        public readonly company: string,
        public readonly balance: number,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateAccountBalanceDto?] {

        const { _id, company, balance } = object;
        
        if ( !_id ) return ['Missing _id'];
        if ( !company ) return ['Missing group'];
        if ( !balance ) return ['Missing balance'];
        if ( !Validators.isMongoID(company) ) return ['Invalid Group ID'];
        if ( !Validators.isMongoID(_id) ) return ['Invalid Group ID'];
        
        return [undefined,  new CreateAccountBalanceDto( _id, company, balance )]

    }
}