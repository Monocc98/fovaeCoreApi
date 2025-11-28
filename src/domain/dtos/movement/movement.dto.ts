import { Validators } from "../../../config";


export class CreateMovementDto {

    private constructor(
        public readonly description : string,
        public readonly account : string,
        public readonly occurredAt : Date,
        public readonly amount : number,
        public readonly source : string,
        public readonly subsubcategory : string,
        // public readonly tags : string,
        public readonly transfererId : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateMovementDto?] {

        const { description, account, occurredAt, amount, source, subsubcategory, transfererId} = object;
        
        if (!account) return ['Missing account'];
        if (!occurredAt) return ['Missing occurredAt'];
        if (!amount) return ['Missing amount'];
        if (!description) return ['Missing description'];

        if (!Validators.isMongoID(account)) return ['Invalid account ID'];
        if (!Validators.isMongoID(subsubcategory)) return ['Invalid subsubcategory ID'];
        

        // validar fecha
        const occurredDate = new Date(occurredAt);
        if (isNaN(occurredDate.getTime())) return ['Invalid occurredAt date'];

        // validar número
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount)) return ['Invalid amount'];
        
        return [undefined,  new CreateMovementDto( description, account, occurredAt, amount, source, subsubcategory, transfererId )]

    }
}

export class UpdateMovementDto {

    private constructor(
        public readonly description : string,
        public readonly amount : number,
        public readonly occurredAt : Date,
        // public readonly source : string,
        public readonly subsubcategory : string,
        // public readonly tags : string,
        public readonly transfererId : string,
    ) {}

    static update( object: { [key: string]: any } ): [string?, UpdateMovementDto?] {

        const { description, amount, occurredAt, subsubcategory, transfererId } = object;
        
        if (!description) return ['Missing occurredAt'];
        if (!occurredAt) return ['Missing occurredAt'];
        if (!amount) return ['Missing amount'];

        if (!Validators.isMongoID(subsubcategory)) return ['Invalid category ID'];

        const occurredDate = new Date(occurredAt);
        if (isNaN(occurredDate.getTime())) return ['Invalid occurredAt date'];

        // validar número
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount)) return ['Invalid amount'];
        
        return [undefined,  new UpdateMovementDto( description, amount, occurredAt, subsubcategory, transfererId )]

    }

}