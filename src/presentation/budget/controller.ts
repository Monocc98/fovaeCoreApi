import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CustomError } from "../../domain";
import { BudgetService } from "../services/budget.service";
import { CreateBudgetDto, UpdateBudgetDto } from "../../domain/dtos/budget/budget.dto";



export class BudgetController {

    // DI
    constructor (
        private readonly budgetService: BudgetService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createBudget = async(req: Request, res: Response) => {

        const [ error, createBudgetDto ] = CreateBudgetDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        this.budgetService.createBudget( createBudgetDto! )
            .then( budget => res.status(201).json( budget ) )
            .catch( error => this.handleError( error, res ) );

    }

    getBudgets = async(req: Request, res: Response) => {


        this.budgetService.getBudgets()
            .then ( budgets => res.json( budgets ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getBudgetsByCompanyId = async(req: Request, res: Response) => {

        const idCompany = req.params.idCompany

        this.budgetService.getBudgetsByCompanyId( idCompany )
            .then( budgets => res.json( budgets ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    getBudgetById = async(req: Request, res: Response) => {

        const idBudget = req.params.idBudget;

        this.budgetService.getBudgetsById( idBudget )
            .then( budgets => res.json( budgets ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    updateBudget = async(req: Request, res: Response) => {

        const idBudget = req.params.idBudget;

        const [ error, updateBudget ] = UpdateBudgetDto.update(req.body);
        if ( error ) return sendValidationError(res, error)

        this.budgetService.updateBudget( idBudget, updateBudget! )
            .then( budget => res.status(201).json( budget ) )
            .catch( error => this.handleError( error, res ) );

    }

    deleteBudget = async(req: Request, res: Response) => {

        const idBudget = req.params.idBudget;


        this.budgetService.deleteBudget( idBudget )
            .then( budget => res.status(201).json( budget ) )
            .catch( error => this.handleError( error, res ) );

    }
}


