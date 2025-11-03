import { Validators } from "../../../config";


export class CreateFiscalYearDto {

    private constructor(
        public readonly name : string,
        public readonly company : string,
        public readonly startDate : Date,
        public readonly endDate : Date,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateFiscalYearDto?] {

        const { name, company, startDate, endDate } = object;
        
        if (!name) return ['Missing name'];
        if (!company) return ['Missing company'];
        if (!startDate) return ['Missing startDate'];
        if (!endDate) return ['Missing endDate'];

        if (!Validators.isMongoID(company)) return ['Invalid company ID'];
        
        return [undefined,  new CreateFiscalYearDto( name, company, startDate, endDate )]

    }
}