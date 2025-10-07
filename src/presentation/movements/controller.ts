import { Response, Request } from "express";
import { CreateMovementDto, CustomError, UpdateMovementDto } from "../../domain";
import { MovementService } from "../services/movement.service";
import { error } from "console";



export class MovementController {

    // DI
    constructor (
        private readonly movementService: MovementService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createMovement = async(req: Request, res: Response) => {

        const [ error, createMovementDto ] = CreateMovementDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.movementService.createMovement( createMovementDto! )
            .then( movement => res.status(201).json( movement ) )
            .catch( error => this.handleError( error, res ) );

    }

    getMovements = async(req: Request, res: Response) => {


        this.movementService.getMovements()
            .then ( movements => res.json( movements ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getMovementsByAccountId = async(req: Request, res: Response) => {

        const idAccount = req.params.idAccount

        this.movementService.getMovementsByAccountId( idAccount )
            .then( movements => res.json( movements ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    getMovementById = async(req: Request, res: Response) => {

        const idMovement = req.params.idMovement;

        this.movementService.getMovementsById( idMovement )
            .then( movements => res.json( movements ))
            .catch( error => this.handleError( error, res ));
        
        
    }

    updateMovement = async(req: Request, res: Response) => {

        const idMovement = req.params.idMovement;

        const [ error, updateMovement ] = UpdateMovementDto.update(req.body);
        if ( error ) return res.status(400).json({ error })

        this.movementService.updateMovement( idMovement, updateMovement! )
            .then( movement => res.status(201).json( movement ) )
            .catch( error => this.handleError( error, res ) );

    }

    deleteMovement = async(req: Request, res: Response) => {

        const idMovement = req.params.idMovement;


        this.movementService.deleteMovement( idMovement )
            .then( movement => res.status(201).json( movement ) )
            .catch( error => this.handleError( error, res ) );

    }
}
