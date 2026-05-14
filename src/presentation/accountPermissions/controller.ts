import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CustomError } from "../../domain";
import { CreateAccountPermissionsDto } from "../../domain/dtos/account/accountPermissions.dto";
import { AccountPermissionsService } from "../services/accountPermissions.service";



export class AccountPermissionsController {

    // DI
    constructor (
        private readonly accountPermissionsService: AccountPermissionsService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createAccountPermissions = async(req: Request, res: Response) => {

        const [ error, createAccountPermissionsDto ] = CreateAccountPermissionsDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        this.accountPermissionsService.createAccountPermissions( createAccountPermissionsDto! )
            .then( accounPermissions => res.status(201).json( accounPermissions ) )
            .catch( error => this.handleError( error, res ) );

    }

    getAccountPermissions = async(req: Request, res: Response) => {

        this.accountPermissionsService.getAccountPermissions()
            .then ( accounPermissions => res.json( accounPermissions ))
            .catch( error => this.handleError( error, res ) );
        
    }
}


