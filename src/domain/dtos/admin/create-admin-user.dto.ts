import { regularExps } from "../../../config";

export class CreateAdminUserDto {

    private constructor(
        public readonly name: string,
        public readonly email: string,
        public readonly password: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateAdminUserDto?] {

        const { name, email, password, role, status } = object;

        if ( role !== undefined ) return ['Role cannot be set in this endpoint'];
        if ( status !== undefined ) return ['Status cannot be set in this endpoint'];
        if ( !name || !String(name).trim() ) return ['Missing name'];
        if ( !email ) return ['Missing email'];
        if ( !regularExps.email.test(String(email).trim()) ) return ['Invalid email format'];
        if ( !password ) return ['Missing password'];
        if ( String(password).length < 8 ) return ['Password too short'];

        return [undefined, new CreateAdminUserDto(
            String(name).trim(),
            String(email).trim().toLowerCase(),
            String(password),
        )];
    }
}
