import { Validators } from "../../../config";


export class CreateCategoryDto {

    private constructor(
        public readonly name : string,
        public readonly company : string,
        public readonly scope : string,
        public readonly account : string,
        public readonly type : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateCategoryDto?] {

        const { name, company, scope, account, type } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing company'];
        if ( !scope ) return ['Missing scope'];
        if ( scope === 'ACCOUNT' && !account ) return ['Missing account'];
        if ( !type ) return ['Missing type'];
        if ( !Validators.isMongoID(company) ) return ['Invalid company ID'];
        if (  scope === 'ACCOUNT' && !Validators.isMongoID(account) ) return ['Invalid account ID'];
        
        return [undefined,  new CreateCategoryDto( name, company, scope, account, type )]

    }
}

export type CategoryReorderLevel = 'category' | 'subcategory' | 'subsubcategory';

export class ReorderCategoriesDto {

    private constructor(
        public readonly level: CategoryReorderLevel,
        public readonly parentId: string,
        public readonly orderedIds: string[],
    ) {}

    static create( object: { [key: string]: any } ): [string?, ReorderCategoriesDto?] {

        const { level, parentId, orderedIds } = object;

        const validLevels: CategoryReorderLevel[] = ['category', 'subcategory', 'subsubcategory'];

        if ( !level ) return ['Missing level'];
        if ( !validLevels.includes(level) ) return ['Invalid level'];
        if ( !parentId ) return ['Missing parentId'];
        if ( !Validators.isMongoID(parentId) ) return ['Invalid parentId'];
        if ( !Array.isArray(orderedIds) || orderedIds.length === 0 ) return ['orderedIds must be a non-empty array'];

        const normalizedIds = orderedIds.map((id) => `${ id }`);

        if ( normalizedIds.some((id) => !Validators.isMongoID(id)) ) return ['orderedIds contains an invalid ID'];
        if ( new Set(normalizedIds).size !== normalizedIds.length ) return ['orderedIds contains duplicate IDs'];

        return [undefined, new ReorderCategoriesDto(level, parentId, normalizedIds)];

    }
}

export class UpdateCategoryDto {

    private constructor(
        public readonly name : string,
        public readonly type : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateCategoryDto?] {

        const { name, type } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !type ) return ['Missing type'];
        
        return [undefined,  new UpdateCategoryDto( name, type )]

    }
}
