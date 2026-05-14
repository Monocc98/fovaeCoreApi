import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CreateCompanyDto, UpdateCompanyFiscalProfileDto } from "../../domain";
import { CompanyService } from "../services/company.service";



export class CompanyController {

    // DI
    constructor (
        private readonly companyService: CompanyService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createCompany = async(req: Request, res: Response) => {

        const [ error, createCompanyDto ] = CreateCompanyDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        this.companyService.createCompany( createCompanyDto! )
            .then( company => res.status(201).json( company ) )
            .catch( error => this.handleError( error, res ) );

    }

    getCompanies = async(req: Request, res: Response) => {
        this.companyService.getCompanies()
            .then ( companies => res.json( companies ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getFiscalProfile = async (req: Request, res: Response) => {
        const currentUser = (req as any).user;
        if (!currentUser?.id) return sendUnauthorizedError(res, "User not authenticated");

        this.companyService.getFiscalProfile(req.params.id, currentUser)
            .then((profile) => res.json(profile))
            .catch((error) => this.handleError(error, res));
    }

    updateFiscalProfile = async (req: Request, res: Response) => {
        const currentUser = (req as any).user;
        if (!currentUser?.id) return sendUnauthorizedError(res, "User not authenticated");

        const [error, updateFiscalProfileDto] = UpdateCompanyFiscalProfileDto.create(req.body);
        if (error) return sendValidationError(res, error);

        this.companyService.updateFiscalProfile(req.params.id, currentUser, updateFiscalProfileDto!)
            .then((profile) => res.json(profile))
            .catch((serviceError) => this.handleError(serviceError, res));
    }
}


