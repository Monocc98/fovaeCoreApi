import { Response, Request } from "express";
import { CreateMembershipDto, CustomError } from "../../domain";
import { MembershipService } from "../services";



export class MembershipController {

    // DI
    constructor (
        private readonly membershipService: MembershipService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createMembership = async(req: Request, res: Response) => {

        const [ error, createMembershipDto ] = CreateMembershipDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.membershipService.createMembership( createMembershipDto! )
            .then( membership => res.status(201).json( membership ) )
            .catch( error => this.handleError( error, res ) );

    }

    getmemberships = async(req: Request, res: Response) => {

        this.membershipService.getMemberships()
            .then ( membership => res.json( membership ))
            .catch( error => this.handleError( error, res ) );
        
    }
}
