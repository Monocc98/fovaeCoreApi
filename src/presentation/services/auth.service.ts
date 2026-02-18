import { bcryptAdapter, envs, JwtAdapter } from "../../config";
import { AuthSessionModel, UserModel } from "../../data";
import { CustomError, LoginUserDto, RegisterUserDto, UserEntity } from "../../domain";
import { buildPermissionsForUser } from "./permissions.service";
import {
    createRandomToken,
    hashToken,
    parseDurationToMs,
} from "../auth/auth-session.helper";



export class AuthService {

    constructor() {}

    private async issueTokensForUser(params: {
        userEntity: Omit<UserEntity, "password"> & { id: string; role: string };
        userAgent?: string;
        ip?: string;
    }) {
        const refreshTokenId = createRandomToken();
        const refreshToken = await JwtAdapter.generateToken(
            { id: params.userEntity.id, sid: refreshTokenId, type: "refresh" },
            envs.REFRESH_TOKEN_TTL
        );
        if (!refreshToken) throw CustomError.internalServer("Error while creating refresh token");

        const accessToken = await JwtAdapter.generateToken(
            { id: params.userEntity.id, role: params.userEntity.role, type: "access" },
            envs.ACCESS_TOKEN_TTL
        );
        if (!accessToken) throw CustomError.internalServer("Error while creating access token");

        const refreshTtlMs = parseDurationToMs(envs.REFRESH_TOKEN_TTL);
        await AuthSessionModel.create({
            sessionId: refreshTokenId,
            user: params.userEntity.id,
            tokenHash: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + refreshTtlMs),
            userAgent: params.userAgent || "",
            ip: params.ip || "",
            lastUsedAt: new Date(),
        });

        return { accessToken, refreshToken };
    }

    public async registerUser( registerUserDto: RegisterUserDto ) {

        const existUser = await UserModel.findOne({ email: registerUserDto.email });
        if ( existUser ) throw CustomError.badRequest('Email already exist');

        try {

            const user = new UserModel(registerUserDto);
            
            // Encriptar contraseña
            user.password = bcryptAdapter.hash( registerUserDto.password );

            await user.save();

            const { password, ...userEntity } = UserEntity.fromObject(user);
            const { accessToken, refreshToken } = await this.issueTokensForUser({
                userEntity,
            });
            const permissions = await buildPermissionsForUser(userEntity);

            return {
                user: userEntity,
                permissions,
                accessToken,
                refreshToken,
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    }

    public async loginUser( loginUserDto: LoginUserDto ) {
        const user = await UserModel.findOne({ email: loginUserDto.email });
        if ( !user ) throw CustomError.unauthorized('Invalid credentials');

        const isMatching = bcryptAdapter.compare( loginUserDto.password, user.password );
        if ( !isMatching) throw CustomError.unauthorized('Invalid credentials');

        const { password, ...userEntity } = UserEntity.fromObject(user);
        const { accessToken, refreshToken } = await this.issueTokensForUser({
            userEntity,
        });

        const permissions = await buildPermissionsForUser(userEntity);

        return {
            user: userEntity,
            permissions,
            accessToken,
            refreshToken,
        }
    }

    public async renewToken(refreshToken: string) {
        if (!refreshToken) throw CustomError.unauthorized("Refresh token missing");

        const payload = await JwtAdapter.validarToken<{ id: string; sid: string; type: string }>(refreshToken);
        if (!payload || payload.type !== "refresh" || !payload.id || !payload.sid) {
            throw CustomError.unauthorized("Refresh token invalid or expired");
        }

        const session = await AuthSessionModel.findOne({ sessionId: payload.sid });
        if (!session) throw CustomError.unauthorized("Session not found");
        if (session.revokedAt) throw CustomError.forbidden("Session revoked");

        if (new Date(session.expiresAt).getTime() <= Date.now()) {
            throw CustomError.unauthorized("Session expired");
        }

        if (session.tokenHash !== hashToken(refreshToken)) {
            session.revokedAt = new Date();
            await session.save();
            throw CustomError.forbidden("Session revoked");
        }

        const user = await UserModel.findById(payload.id);
        if (!user) throw CustomError.unauthorized('User not found');

        const { password, ...userEntity } = UserEntity.fromObject(user);
        const tokens = await this.issueTokensForUser({ userEntity });
        session.revokedAt = new Date();
        session.replacedByTokenHash = hashToken(tokens.refreshToken);
        session.lastUsedAt = new Date();
        await session.save();

        const permissions = await buildPermissionsForUser(userEntity);

        return { user: userEntity, permissions, ...tokens };
    }

    public async logout(refreshToken: string) {
        if (!refreshToken) return { loggedOut: true };

        const payload = await JwtAdapter.validarToken<{ sid: string; type: string }>(refreshToken);
        if (!payload?.sid || payload.type !== "refresh") return { loggedOut: true };

        const session = await AuthSessionModel.findOne({ sessionId: payload.sid });
        if (!session) return { loggedOut: true };

        session.revokedAt = session.revokedAt || new Date();
        session.lastUsedAt = new Date();
        await session.save();

        return { loggedOut: true };
    }

}
