import { Response, Request } from "express";
import { CustomError } from "../../domain";
import { CreateFiscalYear_CompanyDto } from "../../domain/dtos/fiscalYear/membership.dto";
import { FiscalYear_CompanyService } from "../services/fiscalYear_Company.service";



export class FiscalYear_CompanyController {

    // DI
    constructor (
        private readonly fiscalYear_CompanyService: FiscalYear_CompanyService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createFiscalYear_Company = async(req: Request, res: Response) => {

        const [ error, createFiscalYear_CompanyDto ] = CreateFiscalYear_CompanyDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.fiscalYear_CompanyService.createFiscalYear_Company( createFiscalYear_CompanyDto! )
            .then( fiscalYear_Company => res.status(201).json( fiscalYear_Company ) )
            .catch( error => this.handleError( error, res ) );

    }

    getFiscalYears_Companies = async(req: Request, res: Response) => {

        this.fiscalYear_CompanyService.getFiscalYears_Companies()
            .then ( fiscalYear_Company => res.json( fiscalYear_Company ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getFiscalYears_CompaniesByCompanyId = async(req: Request, res: Response) => {

        const idCompany = req.params.idCompany;

        this.fiscalYear_CompanyService.getFiscalYears_CompaniesByCompanyId(idCompany)
            .then ( fiscalYear_Company => res.json( fiscalYear_Company ))
            .catch( error => this.handleError( error, res ) );
        
    }

    lockBudget = async(req: Request, res: Response) => {
        const idFiscalYearCompanie = req.params.idFiscalYearCompanie;

        this.fiscalYear_CompanyService.lockBudget(idFiscalYearCompanie)
            .then ( fiscalYear_Company => res.json( fiscalYear_Company ))
            .catch( error => this.handleError( error, res ) );
    }
}
