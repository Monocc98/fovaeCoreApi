import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CustomError } from "../../domain";
import { CreateFiscalYearDto } from "../../domain/dtos/fiscalYear/fiscalYear.dto";
import { FiscalYearService } from "../services/fiscalYear.service";



export class FiscalYearController {

    // DI
    constructor (
        private readonly fiscalYearService: FiscalYearService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createFiscalYear = async(req: Request, res: Response) => {

        const [ error, createFiscalYearDto ] = CreateFiscalYearDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        this.fiscalYearService.createFiscalYear( createFiscalYearDto! )
            .then( fiscalYear => res.status(201).json( fiscalYear ) )
            .catch( error => this.handleError( error, res ) );

    }

    getFiscalYears = async(req: Request, res: Response) => {


        this.fiscalYearService.getFiscalYears()
            .then ( fiscalYears => res.json( fiscalYears ))
            .catch( error => this.handleError( error, res ) );
        
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
        if ( error ) return sendValidationError(res, error)

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


