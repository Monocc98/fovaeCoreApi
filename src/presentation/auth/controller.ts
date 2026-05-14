import { Request, Response } from "express";
import { envs } from "../../config";
import { LoginUserDto, RegisterUserDto } from "../../domain";
import { AuthService } from "../services";
import { sendErrorResponse, sendValidationError } from "../errors/http-error-response";
import {
    clearAuthCookies,
    createRandomToken,
    getRefreshTokenFromRequest,
    setAuthCookies,
} from "./auth-session.helper";


export class AuthController {

    // DI
    constructor(
        public readonly authService: AuthService,
    ) {}

    private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

    registerUser = ( req: Request, res: Response) => {

        const [ error, registerDto ] = RegisterUserDto.create(req.body);

        if ( error ) return sendValidationError(res, error);
        
        this.authService.registerUser(registerDto!)
            .then( ({ accessToken, refreshToken, ...payload }) => {
                const csrfToken = createRandomToken();
                setAuthCookies({ res, accessToken, refreshToken, csrfToken });

                return res.json({
                    ...payload,
                    csrf: {
                        headerName: envs.CSRF_HEADER_NAME,
                        token: csrfToken,
                    },
                });
            })
            .catch( error => this.handleError(error, res) );

    }

    loginUser = ( req: Request, res: Response) => {

        const [ error, loginUserDto ] = LoginUserDto.create(req.body);

        if ( error ) return sendValidationError(res, error);
        
        this.authService.loginUser(loginUserDto!)
            .then( ({ accessToken, refreshToken, ...payload }) => {
                const csrfToken = createRandomToken();
                setAuthCookies({ res, accessToken, refreshToken, csrfToken });

                return res.json({
                    ...payload,
                    csrf: {
                        headerName: envs.CSRF_HEADER_NAME,
                        token: csrfToken,
                    },
                });
            })
            .catch( error => this.handleError(error, res) );


    }

    renewToken = ( req: Request, res: Response ) => {
        const refreshToken = getRefreshTokenFromRequest(req);
        this.authService.renewToken(refreshToken)
            .then(({ accessToken, refreshToken: newRefreshToken, ...payload }) => {
                const csrfToken = createRandomToken();
                setAuthCookies({
                    res,
                    accessToken,
                    refreshToken: newRefreshToken,
                    csrfToken,
                });

                return res.json({
                    ...payload,
                    csrf: {
                        headerName: envs.CSRF_HEADER_NAME,
                        token: csrfToken,
                    },
                });
            })
            .catch(error => this.handleError(error, res));

    }

    logout = (req: Request, res: Response) => {
        const refreshToken = getRefreshTokenFromRequest(req);
        this.authService.logout(refreshToken)
            .then(() => {
                clearAuthCookies(res);
                return res.json({ loggedOut: true });
            })
            .catch((error) => this.handleError(error, res));
    };

}
