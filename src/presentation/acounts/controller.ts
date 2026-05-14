import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CreateAccountDto, CustomError, UpdateAccountDto } from "../../domain";
import { AccountService } from "../services/account.service";



export class AccountsController {

    // DI
    constructor (
        private readonly accountService: AccountService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createAccount = async(req: Request, res: Response) => {

        const [ error, createAccountDto ] = CreateAccountDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        this.accountService.createAccount( createAccountDto! )
            .then( (account) => {
                this.accountService.createAccountBalances( { _id: account.account.id, balance: 0.00 } )
                                    .then( account => res.status(201).json( account ) )
                
            } )
            .catch( error => this.handleError( error, res ) );

    }

    getAccounts = async(req: Request, res: Response) => {
        
        this.accountService.getAccounts()
            .then ( account => res.json( account ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getAccountsByIdCompany = async(req: Request, res: Response) => {

        const idCompany = req.params.idCompany;
        
        this.accountService.getAccountsByIdCompany(idCompany)
            .then ( accounts => res.json( accounts ))
            .catch( error => this.handleError( error, res ) );
        
    }

    updateAccount = async(req: Request, res: Response) => {
    
        const idAccount = req.params.idAccount;

        const [ error, updateAccount ] = UpdateAccountDto.update(req.body);
        if ( error ) return sendValidationError(res, error)

        this.accountService.updateAccount( idAccount, updateAccount! )
            .then( account => res.status(201).json( account ) )
            .catch( error => this.handleError( error, res ) );

    }
    
    deleteAccount = async(req: Request, res: Response) => {

        const idAccount = req.params.idAccount;


        this.accountService.deleteAccount( idAccount )
            .then( account => res.status(201).json( account ) )
            .catch( error => this.handleError( error, res ) );

    }
}


