import { Response, Request } from "express";
import { CustomError } from "../../domain";
import { BudgetService } from "../services/budget.service";
import { CreateBudgetDto, UpdateBudgetDto } from "../../domain/dtos/budget/budget.dto";



export class BudgetController {

    // DI
    constructor (
        private readonly budgetService: BudgetService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createBudget = async(req: Request, res: Response) => {

        const [ error, createBudgetDto ] = CreateBudgetDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.budgetService.createBudget( createBudgetDto! )
            .then( budget => res.status(201).json( budget ) )
            .catch( error => this.handleError( error, res ) );

    }

    getBudgets = async(req: Request, res: Response) => {


        this.budgetService.getBudgets()
            .then ( budgets => res.json( budgets ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getBudgetsByAccountId = async(req: Request, res: Response) => {

        const idAccount = req.params.idAccount

        this.budgetService.getBudgetsByAccountId( idAccount )
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
        if ( error ) return res.status(400).json({ error })

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
