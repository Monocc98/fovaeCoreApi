import { Validators } from "../../../config";

export interface AdminAccountPermissionInput {
    accountId: string;
    canView: boolean;
    canEdit: boolean;
}

export interface AdminCompanyPermissionInput {
    companyId: string;
    status: 'active' | 'disabled';
    baseRole: 'ADMIN' | 'VIEWER';
    accounts: AdminAccountPermissionInput[];
}

export class UpdateAdminUserPermissionsDto {

    private constructor(
        public readonly globalRole: 'STANDARD' | 'SUPER_ADMIN',
        public readonly companyPermissions: AdminCompanyPermissionInput[],
    ) {}

    static create( object: { [key: string]: any } ): [string?, UpdateAdminUserPermissionsDto?] {

        const { globalRole, companyPermissions } = object;

        if ( !globalRole ) return ['Missing globalRole'];
        if ( !['STANDARD', 'SUPER_ADMIN'].includes(String(globalRole)) ) return ['Invalid globalRole'];
        if ( !Array.isArray(companyPermissions) ) return ['companyPermissions must be an array'];

        const normalizedCompanies: AdminCompanyPermissionInput[] = [];
        const companyIds = new Set<string>();

        for (const companyPermission of companyPermissions) {
            const companyId = String(companyPermission?.companyId || '');
            const status = String(companyPermission?.status || '') as 'active' | 'disabled';
            const baseRole = String(companyPermission?.baseRole || '') as 'ADMIN' | 'VIEWER';
            const accounts = Array.isArray(companyPermission?.accounts) ? companyPermission.accounts : null;

            if ( !companyId ) return ['Missing companyId'];
            if ( !Validators.isMongoID(companyId) ) return ['Invalid companyId'];
            if ( companyIds.has(companyId) ) return ['Duplicate companyId'];
            if ( !['active', 'disabled'].includes(status) ) return ['Invalid company status'];
            if ( !['ADMIN', 'VIEWER'].includes(baseRole) ) return ['Invalid baseRole'];
            if ( accounts === null ) return ['accounts must be an array'];

            companyIds.add(companyId);

            const normalizedAccounts: AdminAccountPermissionInput[] = [];
            const accountIds = new Set<string>();

            for (const accountPermission of accounts) {
                const accountId = String(accountPermission?.accountId || '');
                const canView = !!accountPermission?.canView;
                const canEdit = !!accountPermission?.canEdit;

                if ( !accountId ) return ['Missing accountId'];
                if ( !Validators.isMongoID(accountId) ) return ['Invalid accountId'];
                if ( accountIds.has(accountId) ) return ['Duplicate accountId in company permissions'];
                if ( canEdit && !canView ) return ['canEdit requires canView'];

                accountIds.add(accountId);
                normalizedAccounts.push({
                    accountId,
                    canView,
                    canEdit,
                });
            }

            normalizedCompanies.push({
                companyId,
                status,
                baseRole,
                accounts: normalizedAccounts,
            });
        }

        return [undefined, new UpdateAdminUserPermissionsDto(
            String(globalRole) as 'STANDARD' | 'SUPER_ADMIN',
            normalizedCompanies,
        )];
    }
}
