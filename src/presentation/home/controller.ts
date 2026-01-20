import { Response, Request } from "express";
import { CreateGroupDto, CustomError } from "../../domain";
import { HomeService } from "../services/home.service";



export class HomeController {

    // DI
    constructor (
        private readonly homeService: HomeService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    getHomeOverview = async(req: Request, res: Response) => {

        
        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        await this.homeService.getHomeOverview(user.id)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getCompanyBudgetVsActual = async(req: Request, res: Response) => {

        const user = (req as any).user;
        if (!user?.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const mockFiscalYearId = '696e87baeea58af170d44057';

        await this.homeService.getCompanyBudgetVsActual(user.id, mockFiscalYearId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }


}
