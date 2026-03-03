import { regularExps } from "../../../config";

export class UpdateAdminUserDto {

    private constructor(
        public readonly name?: string,
        public readonly email?: string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateAdminUserDto?] {

        const { name, email, role, status } = object;

        if ( role !== undefined ) return ['Role cannot be updated in this endpoint'];
        if ( status !== undefined ) return ['Status cannot be updated in this endpoint'];
        if ( name === undefined && email === undefined ) return ['At least one field must be provided'];
        if ( name !== undefined && !String(name).trim() ) return ['Invalid name'];
        if ( email !== undefined && !regularExps.email.test(String(email).trim()) ) return ['Invalid email format'];

        return [undefined, new UpdateAdminUserDto(
            name === undefined ? undefined : String(name).trim(),
            email === undefined ? undefined : String(email).trim().toLowerCase(),
        )];
    }
}
