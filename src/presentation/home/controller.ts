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
        const fiscalYearId = typeof req.query.fiscalYearId === "string" ? req.query.fiscalYearId : undefined;

        await this.homeService.getHomeOverview(user.id, fiscalYearId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getCompanyBudgetVsActual = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }
        const fiscalYearId = typeof req.query.fiscalYearId === "string" ? req.query.fiscalYearId : undefined;

        await this.homeService.getCompanyBudgetVsActual(user.id, fiscalYearId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getHomeBucketsSummary = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }
        const fiscalYearId = typeof req.query.fiscalYearId === "string" ? req.query.fiscalYearId : undefined;

        await this.homeService.getHomeBucketsSummary(user.id, fiscalYearId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getUnmappedBucketMovements = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return sendUnauthorizedError(res, "User not authenticated");
        }
        const fiscalYearId = typeof req.query.fiscalYearId === "string" ? req.query.fiscalYearId : undefined;

        await this.homeService.getUnmappedBucketMovements(user.id, fiscalYearId)
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
        const fiscalYearId = typeof req.query.fiscalYearId === "string" ? req.query.fiscalYearId : undefined;

        await this.homeService.getGroupDividends(user.id, user.role, groupId, requestedUserId, fiscalYearId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

}


