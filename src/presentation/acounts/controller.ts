import { Response, Request } from "express";
import { CreateAccountDto, CustomError } from "../../domain";
import { AccountService } from "../services/account.service";



export class AccountsController {

    // DI
    constructor (
        private readonly accountService: AccountService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createAccount = async(req: Request, res: Response) => {

        const [ error, createAccountDto ] = CreateAccountDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.accountService.createAccount( createAccountDto! )
            .then( account => res.status(201).json( account ) )
            .catch( error => this.handleError( error, res ) );

    }

    getAccounts = async(req: Request, res: Response) => {
        
        this.accountService.getAccounts()
            .then ( account => res.json( account ))
            .catch( error => this.handleError( error, res ) );
        
    }
}
