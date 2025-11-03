import { Response, Request } from "express";
import { CustomError } from "../../domain";
import { CreateFiscalYearDto } from "../../domain/dtos/fiscalYear/fiscalYear.dto";
import { FiscalYearService } from "../services/fiscalYear.service";



export class FiscalYearController {

    // DI
    constructor (
        private readonly fiscalYearService: FiscalYearService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createFiscalYear = async(req: Request, res: Response) => {

        const [ error, createFiscalYearDto ] = CreateFiscalYearDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.fiscalYearService.createFiscalYear( createFiscalYearDto! )
            .then( fiscalYear => res.status(201).json( fiscalYear ) )
            .catch( error => this.handleError( error, res ) );

    }

    getFiscalYears = async(req: Request, res: Response) => {


        this.fiscalYearService.getFiscalYears()
            .then ( fiscalYears => res.json( fiscalYears ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getFiscalYearsByCompanyId = async(req: Request, res: Response) => {

        const idCompany = req.params.idCompany

        this.fiscalYearService.getFiscalYearsByCompanyId( idCompany )
            .then( fiscalYears => res.json( fiscalYears ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    getFiscalYearById = async(req: Request, res: Response) => {

        const idFiscalYear = req.params.idFiscalYear;

        this.fiscalYearService.getFiscalYearsById( idFiscalYear )
            .then( fiscalYears => res.json( fiscalYears ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    updateFiscalYear = async(req: Request, res: Response) => {

        const idFiscalYear = req.params.idFiscalYear;

        const [ error, updateFiscalYear ] = CreateFiscalYearDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.fiscalYearService.updateFiscalYear( idFiscalYear, updateFiscalYear! )
            .then( fiscalYear => res.status(201).json( fiscalYear ) )
            .catch( error => this.handleError( error, res ) );

    }

    deleteFiscalYear = async(req: Request, res: Response) => {

        const idFiscalYear = req.params.idFiscalYear;


        this.fiscalYearService.deleteFiscalYear( idFiscalYear )
            .then( fiscalYear => res.status(201).json( fiscalYear ) )
            .catch( error => this.handleError( error, res ) );

    }
}
