import jwt, { SignOptions } from 'jsonwebtoken'
import { envs } from './envs';

const JWT_SEED = envs.JWT_SEED;

export class JwtAdapter {

    //DI ?

    static generateToken( payload: any, duration: string = '2h' ): Promise<string | null> {

        return new Promise<string | null>((resolve) => {
            jwt.sign(payload, JWT_SEED, { expiresIn: duration } as SignOptions, (err, token) => {
                 if ( err ) return resolve( null );

                 resolve( token || null );
            });
        });
        
    }

    static validarToken<T>( token: string ): Promise<T|null> {
        
        return new Promise( (resolve) => {
                jwt.verify( token, JWT_SEED, (err, decoded) => {
                    if ( err ) return resolve(null);

                    resolve(decoded as T);
                } )
        })
        
    }
 
}
