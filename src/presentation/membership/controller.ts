import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CreateMembershipDto, CustomError } from "../../domain";
import { MembershipService } from "../services";



export class MembershipController {

    // DI
    constructor (
        private readonly membershipService: MembershipService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    createMembership = async(req: Request, res: Response) => {

        const [ error, createMembershipDto ] = CreateMembershipDto.create(req.body);
        if ( error ) return sendValidationError(res, error)

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


