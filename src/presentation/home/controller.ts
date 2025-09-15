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

        const mockId = '68aca3ced36be4df237ce459';
        await this.homeService.getHomeOverview(mockId)
            .then ( overview => res.json( overview ))
            .catch( error => this.handleError( error, res ) );
        
    }
}
