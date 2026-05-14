import { Response, Request } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CreateGroupDto, CustomError } from "../../domain";
import { HomeService } from "../services/home.service";



export class HomeController {

    // DI
    constructor (
        private readonly homeService: HomeService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    getHomeOverview = async(req: Request, res: Response) => {

        
        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }

        await this.homeService.getHomeOverview(user.id)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getCompanyBudgetVsActual = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }

        await this.homeService.getCompanyBudgetVsActual(user.id)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getHomeBucketsSummary = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }

        await this.homeService.getHomeBucketsSummary(user.id)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getUnmappedBucketMovements = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }

        await this.homeService.getUnmappedBucketMovements(user.id)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getGroupDividends = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }

        const groupId = req.params.groupId;
        const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;

        await this.homeService.getGroupDividends(user.id, user.role, groupId, requestedUserId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

}


