import { Validators } from "../../../config";


export class CreateAccountBalanceDto {

    private constructor(
        public readonly _id: string,
        public readonly balance: number,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateAccountBalanceDto?] {

        const { _id, company, balance } = object;
        
        if ( !_id ) return ['Missing _id'];
        if ( !Validators.isMongoID(_id) ) return ['Invalid Group ID'];

        // balance opcional, por defecto "0.00"
        const initial = (balance ?? '0.00').toString();
        
        return [undefined,  new CreateAccountBalanceDto( _id, balance )]

    }
}