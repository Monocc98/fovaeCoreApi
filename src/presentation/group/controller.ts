import { Response, Request } from "express";
import { CreateGroupDto, CustomError } from "../../domain";
import { GroupService } from "../services";



export class GroupController {

    // DI
    constructor (
        private readonly groupService: GroupService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createGroup = async(req: Request, res: Response) => {

        const [ error, createGroupDto ] = CreateGroupDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

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
