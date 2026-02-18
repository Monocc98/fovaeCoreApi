import { Request, Response } from "express";
import { envs } from "../../config";
import { CustomError, LoginUserDto, RegisterUserDto } from "../../domain";
import { AuthService } from "../services";
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

    private handleError = ( error: unknown, res: Response ) => {
        const requestId = String(res.getHeader("x-request-id") || "");
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({
                error: {
                    status: error.statusCode,
                    code: `AUTH_${error.statusCode}`,
                    message: error.message,
                    requestId,
                },
            });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({
            error: {
                status: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Internal server error",
                requestId,
            },
        });
    }

    registerUser = ( req: Request, res: Response) => {

        const [ error, registerDto ] = RegisterUserDto.create(req.body);

        if ( error ) return res.status(400).json({ error })
        
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
            .catch( error => this.handleError(error, res) )

    }

    loginUser = ( req: Request, res: Response) => {

        const [ error, loginUserDto ] = LoginUserDto.create(req.body);

        if ( error ) return res.status(400).json({ error })
        
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
            .catch( error => this.handleError(error, res) )


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
