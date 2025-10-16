import { Validators } from "../../../config";


export class CreateBudgetDto {

    private constructor(
        public readonly year : number,
        public readonly month : number,
        public readonly account : string,
        public readonly amount : number,
        public readonly subsubcategory : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateBudgetDto?] {

        const { year, month, account, amount, subsubcategory } = object;
        
        if (!account) return ['Missing account'];
        if (!year) return ['Missing year'];
        if (!amount) return ['Missing amount'];
        if (!month) return ['Missing month'];
        if (!subsubcategory) return ['Missing subsubcategory'];

        if (!Validators.isMongoID(account)) return ['Invalid account ID'];
        if (!Validators.isMongoID(subsubcategory)) return ['Invalid subsubcategory ID'];
        

        // validar número
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount)) return ['Invalid amount'];
        
        return [undefined,  new CreateBudgetDto( year, month, account, amount, subsubcategory )]

    }
}

export class UpdateBudgetDto {

    private constructor(
        public readonly year : number,
        public readonly month : number,
        public readonly amount : number,
        public readonly subsubcategory : string,
    ) {}

    static update( object: { [key: string]: any } ): [string?, UpdateBudgetDto?] {

        const { year, month, amount, subsubcategory } = object;
        
        if (!year) return ['Missing year'];
        if (!amount) return ['Missing amount'];
        if (!month) return ['Missing month'];
        if (!subsubcategory) return ['Missing subsubcategory'];

        if (!Validators.isMongoID(subsubcategory)) return ['Invalid category ID'];

        // validar número
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount)) return ['Invalid amount'];
        
        return [undefined,  new UpdateBudgetDto( year, month, amount, subsubcategory )]

    }

}