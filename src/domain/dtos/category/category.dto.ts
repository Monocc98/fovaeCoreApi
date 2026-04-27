import { Validators } from "../../../config";

export const CATEGORY_SCOPES = ['COMPANY', 'ACCOUNT'] as const;
export const CATEGORY_TYPES = ['INCOME', 'EXPENSE'] as const;
export const CATEGORY_BUCKETS = ['INCOME', 'UTILITY', 'FIXED_EXPENSE', 'VARIABLE_EXPENSE', 'FAMILY'] as const;
export const INCOME_CATEGORY_BUCKETS = ['INCOME', 'UTILITY'] as const;
export const EXPENSE_CATEGORY_BUCKETS = ['FIXED_EXPENSE', 'VARIABLE_EXPENSE', 'FAMILY'] as const;

const normalizeString = (value: unknown) => String(value ?? '').trim().toUpperCase();

const validateCategoryTypeAndBucket = (type: unknown, bucket: unknown): [string?, string?, string?] => {
    const normalizedType = normalizeString(type);
    const normalizedBucket = normalizeString(bucket);

    if ( !CATEGORY_TYPES.includes(normalizedType as typeof CATEGORY_TYPES[number]) ) {
        return ['Invalid type'];
    }

    if ( !normalizedBucket ) {
        return ['Missing bucket'];
    }

    if ( !CATEGORY_BUCKETS.includes(normalizedBucket as typeof CATEGORY_BUCKETS[number]) ) {
        return ['Invalid bucket'];
    }

    if (
        normalizedType === 'INCOME' &&
        !INCOME_CATEGORY_BUCKETS.includes(normalizedBucket as typeof INCOME_CATEGORY_BUCKETS[number])
    ) {
        return ['Income categories must use bucket INCOME or UTILITY'];
    }

    if (
        normalizedType === 'EXPENSE' &&
        !EXPENSE_CATEGORY_BUCKETS.includes(normalizedBucket as typeof EXPENSE_CATEGORY_BUCKETS[number])
    ) {
        return ['Expense categories must use FIXED_EXPENSE, VARIABLE_EXPENSE or FAMILY'];
    }

    return [undefined, normalizedType, normalizedBucket];
};

export class CreateCategoryDto {

    private constructor(
        public readonly name : string,
        public readonly company : string,
        public readonly scope : string,
        public readonly account : string,
        public readonly type : string,
        public readonly bucket : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, CreateCategoryDto?] {

        const { name, company, scope, account, type, bucket } = object;
        const normalizedScope = normalizeString(scope);
        
        if ( !name ) return ['Missing name'];
        if ( !company ) return ['Missing company'];
        if ( !normalizedScope ) return ['Missing scope'];
        if ( !CATEGORY_SCOPES.includes(normalizedScope as typeof CATEGORY_SCOPES[number]) ) return ['Invalid scope'];
        if ( normalizedScope === 'ACCOUNT' && !account ) return ['Missing account'];
        if ( !type ) return ['Missing type'];

        const [ bucketError, normalizedType, normalizedBucket ] = validateCategoryTypeAndBucket(type, bucket);
        if ( bucketError ) return [bucketError];

        if ( !Validators.isMongoID(company) ) return ['Invalid company ID'];
        if ( normalizedScope === 'ACCOUNT' && !Validators.isMongoID(account) ) return ['Invalid account ID'];
        
        return [undefined,  new CreateCategoryDto( name, company, normalizedScope, account, normalizedType!, normalizedBucket! )]

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
        public readonly bucket : string,
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateCategoryDto?] {

        const { name, type, bucket } = object;
        
        if ( !name ) return ['Missing name'];
        if ( !type ) return ['Missing type'];

        const [ bucketError, normalizedType, normalizedBucket ] = validateCategoryTypeAndBucket(type, bucket);
        if ( bucketError ) return [bucketError];
        
        return [undefined,  new UpdateCategoryDto( name, normalizedType!, normalizedBucket! )]

    }
}
