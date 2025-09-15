import { regularExps } from "../../../config";


export class LoginUserDto {

    private constructor(
        public email: string,
        public password: string,
    ) {}

    static create( object: { [key:string]: any }): [string?, LoginUserDto?] {
        const { email, password } = object;

        if (!email ) return ['Missing email'];
        if (!regularExps.email.test( email )) return ['Invalid email format'];
        if (!password ) return ['Missing password'];
        if (password.length < 6 ) return ['Passord too short'];

        return [undefined, new LoginUserDto(email, password)];
    }
}