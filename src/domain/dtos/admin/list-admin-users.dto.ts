export class ListAdminUsersDto {

    private constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly status?: 'active' | 'disabled' | 'all',
    ) {}

    static create( object: { [key: string]: any } ): [string?, ListAdminUsersDto?] {

        const rawPage = object.page ?? 1;
        const rawLimit = object.limit ?? 20;
        const rawSearch = object.search;
        const rawStatus = object.status ?? 'all';

        const page = Number(rawPage);
        const limit = Number(rawLimit);
        const status = String(rawStatus) as 'active' | 'disabled' | 'all';

        if ( !Number.isInteger(page) || page < 1 ) return ['Invalid page'];
        if ( !Number.isInteger(limit) || limit < 1 || limit > 100 ) return ['Invalid limit'];
        if ( !['active', 'disabled', 'all'].includes(status) ) return ['Invalid status'];

        return [undefined, new ListAdminUsersDto(
            page,
            limit,
            rawSearch === undefined ? undefined : String(rawSearch).trim(),
            status,
        )];
    }
}
