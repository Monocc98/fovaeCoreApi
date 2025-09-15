import { Response, Request } from "express";
import { CreateCompanyDto, CustomError } from "../../domain";
import { CompanyService } from "../services/company.service";



export class CompanyController {

    // DI
    constructor (
        private readonly companyService: CompanyService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createCompany = async(req: Request, res: Response) => {

        const [ error, createCompanyDto ] = CreateCompanyDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.companyService.createCompany( createCompanyDto! )
            .then( company => res.status(201).json( company ) )
            .catch( error => this.handleError( error, res ) );

    }

    getCompanies = async(req: Request, res: Response) => {


        this.companyService.getCompanies()
            .then ( companies => res.json( companies ))
            .catch( error => this.handleError( error, res ) );
        
    }
}
