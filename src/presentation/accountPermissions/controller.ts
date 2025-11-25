import { Response, Request } from "express";
import { CustomError } from "../../domain";
import { CreateAccountPermissionsDto } from "../../domain/dtos/account/accountPermissions.dto";
import { AccountPermissionsService } from "../services/accountPermissions.service";



export class AccountPermissionsController {

    // DI
    constructor (
        private readonly accountPermissionsService: AccountPermissionsService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createAccountPermissions = async(req: Request, res: Response) => {

        const [ error, createAccountPermissionsDto ] = CreateAccountPermissionsDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

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
