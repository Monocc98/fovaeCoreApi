import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CreateGroupDto, CustomError } from "../../domain";
import { GroupService } from "../services";



export class GroupController {

    // DI
    constructor (
        private readonly groupService: GroupService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createGroup = async(req: Request, res: Response) => {

        const [ error, createGroupDto ] = CreateGroupDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

        await this.groupService.createGroup( createGroupDto! )
            .then( group => res.status(201).json( group ) )
            // .then( res.status(201).json() );
            .catch( error => this.handleError( error, res ) );

    }

    getGroup = async(req: Request, res: Response) => {


        await this.groupService.getGroups()
            .then ( groups => res.json( groups ))
            .catch( error => this.handleError( error, res ) );
        
    }
}


