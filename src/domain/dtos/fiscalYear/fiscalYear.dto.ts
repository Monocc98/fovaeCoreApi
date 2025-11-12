import { Validators } from "../../../config";


export class CreateFiscalYearDto {

    private constructor(
        public readonly name : string,
        public readonly startDate : Date,
        public readonly endDate : Date,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateFiscalYearDto?] {

        const { name, startDate, endDate } = object;
        
        if (!name) return ['Missing name'];
        if (!startDate) return ['Missing startDate'];
        if (!endDate) return ['Missing endDate'];
        
        return [undefined,  new CreateFiscalYearDto( name, startDate, endDate )]

    }
}