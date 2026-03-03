import mongoose from "mongoose";
import { bcryptAdapter, Validators } from "../../config";
import { AccountModel, CompanyModel, MembershipModel, UserModel } from "../../data";
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import {
    CreateAdminUserDto,
    CustomError,
    ListAdminUsersDto,
    UpdateAdminUserDto,
    UpdateAdminUserPermissionsDto,
} from "../../domain";
import { revokeAllUserSessions } from "../auth/auth-session.helper";

type ManageableUserDoc = Record<string, any>;

export class AdminUsersService {

    constructor() {}

    private isTransactionNotSupportedError(error: unknown) {
        const message = `${ error }`.toLowerCase();
        return (
            message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
            message.includes('replica set') ||
            message.includes('transactions are not supported')
        );
    }

    private mapUser(user: any) {
        if (!user) return user;

        const source = typeof user.toJSON === "function" ? user.toJSON() : user;
        const id = String(source.id ?? source._id);

        return {
            id,
            name: source.name,
            email: source.email,
            role: source.role,
            status: source.status || "active",
            createdAt: source.createdAt,
            updatedAt: source.updatedAt,
        };
    }

    private async getManageableUserById(userId: string) {
        if (!Validators.isMongoID(userId)) throw CustomError.badRequest("Invalid user ID");

        const user = await UserModel.findById(Validators.convertToUid(userId));
        if (!user) throw CustomError.notFound("User not found");
        if (user.role === "SUPER_ADMIN") throw CustomError.forbidden("SUPER_ADMIN users cannot be managed in this endpoint");

        return user;
    }

    private async buildUserPermissionsView(user: ManageableUserDoc) {
        const memberships = await MembershipModel.find({ user: user._id }).lean();
        const membershipIds = memberships.map((membership: any) => membership._id);

        const accountOverrides = membershipIds.length > 0
            ? await AccountPermissionsModel.find({ membership: { $in: membershipIds } }).lean()
            : [];

        const companiesById = new Map<string, any>();
        const accountsByCompany = new Map<string, any[]>();
        const overridesByMembership = new Map<string, any[]>();

        for (const override of accountOverrides) {
            const membershipId = String(override.membership);
            const current = overridesByMembership.get(membershipId) ?? [];
            current.push(override);
            overridesByMembership.set(membershipId, current);
        }

        for (const membership of memberships) {
            const companyId = String(membership.company);

            if (!companiesById.has(companyId)) {
                const company = await CompanyModel.findById(membership.company).lean();
                if (!company) continue;
                companiesById.set(companyId, company);
            }

            if (!accountsByCompany.has(companyId)) {
                const accounts = await AccountModel.find({ company: membership.company }).lean();
                accountsByCompany.set(companyId, accounts);
            }
        }

        const companyPermissions = memberships.map((membership: any) => {
            const companyId = String(membership.company);
            const accounts = accountsByCompany.get(companyId) ?? [];
            const overrides = overridesByMembership.get(String(membership._id)) ?? [];

            const accountsView = accounts.map((account: any) => {
                const override = overrides.find((item: any) => String(item.account) === String(account._id));
                const baseRole = membership.role === "ADMIN" ? "ADMIN" : "VIEWER";

                let canView = true;
                let canEdit = baseRole === "ADMIN";

                if (override) {
                    canView = !!override.canView;
                    canEdit = !!override.canEdit;
                }

                return {
                    accountId: String(account._id),
                    canView,
                    canEdit,
                };
            });

            return {
                companyId,
                membershipId: String(membership._id),
                status: membership.status,
                baseRole: membership.role === "ADMIN" ? "ADMIN" : "VIEWER",
                accounts: accountsView,
            };
        });

        return {
            userId: String(user._id),
            status: user.status || "active",
            permissions: {
                globalRole: user.role,
                companyPermissions,
            },
        };
    }

    private async syncUserPermissions(
        user: any,
        updateAdminUserPermissionsDto: UpdateAdminUserPermissionsDto,
        session?: mongoose.ClientSession,
    ) {
        user.role = "STANDARD";
        await user.save(session ? { session } : undefined);

        const membershipsQuery = MembershipModel.find({ user: user._id });
        const existingMemberships = session
            ? await membershipsQuery.session(session)
            : await membershipsQuery;
        const membershipByCompany = new Map<string, any>();

        for (const membership of existingMemberships) {
            membershipByCompany.set(String(membership.company), membership);
        }

        const touchedCompanyIds = new Set<string>();

        for (const companyPermission of updateAdminUserPermissionsDto.companyPermissions) {
            const companyIdMongo = Validators.convertToUid(companyPermission.companyId);
            const companyQuery = CompanyModel.findById(companyIdMongo);
            const company = session ? await companyQuery.session(session) : await companyQuery;
            if (!company) throw CustomError.badRequest(`Company not found: ${ companyPermission.companyId }`);

            let membership = membershipByCompany.get(companyPermission.companyId);
            if (!membership) {
                membership = new MembershipModel({
                    user: user._id,
                    company: companyIdMongo,
                    role: companyPermission.baseRole,
                    status: companyPermission.status,
                });
            } else {
                membership.role = companyPermission.baseRole;
                membership.status = companyPermission.status;
            }

            await membership.save(session ? { session } : undefined);
            membershipByCompany.set(companyPermission.companyId, membership);
            touchedCompanyIds.add(companyPermission.companyId);

            const companyAccountsQuery = AccountModel.find({ company: companyIdMongo }).lean();
            const companyAccounts = session
                ? await companyAccountsQuery.session(session)
                : await companyAccountsQuery;
            const validAccountIds = new Set(companyAccounts.map((account: any) => String(account._id)));

            for (const accountPermission of companyPermission.accounts) {
                if (!validAccountIds.has(accountPermission.accountId)) {
                    throw CustomError.badRequest(`Account ${ accountPermission.accountId } does not belong to company ${ companyPermission.companyId }`);
                }
            }

            const overridesQuery = AccountPermissionsModel.find({
                membership: membership._id,
            });
            const existingOverrides = session
                ? await overridesQuery.session(session)
                : await overridesQuery;
            const overrideByAccount = new Map<string, any>();

            for (const override of existingOverrides) {
                overrideByAccount.set(String(override.account), override);
            }

            const touchedAccountIds = new Set<string>();

            for (const accountPermission of companyPermission.accounts) {
                let override = overrideByAccount.get(accountPermission.accountId);

                if (!override) {
                    override = new AccountPermissionsModel({
                        membership: membership._id,
                        account: Validators.convertToUid(accountPermission.accountId),
                    });
                }

                override.canView = accountPermission.canView;
                override.canEdit = accountPermission.canEdit;
                await override.save(session ? { session } : undefined);
                touchedAccountIds.add(accountPermission.accountId);
            }

            const overridesToDelete = existingOverrides
                .filter((override: any) => !touchedAccountIds.has(String(override.account)))
                .map((override: any) => override._id);

            if (overridesToDelete.length > 0) {
                const deleteQuery = AccountPermissionsModel.deleteMany({
                    _id: { $in: overridesToDelete },
                });

                if (session) {
                    await deleteQuery.session(session);
                } else {
                    await deleteQuery;
                }
            }
        }

        for (const membership of existingMemberships) {
            const companyId = String(membership.company);
            if (touchedCompanyIds.has(companyId)) continue;

            membership.status = "disabled";
            await membership.save(session ? { session } : undefined);
        }
    }

    async listUsers(listAdminUsersDto: ListAdminUsersDto) {
        try {
            const query: Record<string, any> = {
                role: "STANDARD",
            };

            if (listAdminUsersDto.status === "active") {
                query.$or = [
                    { status: "active" },
                    { status: { $exists: false } },
                ];
            } else if (listAdminUsersDto.status === "disabled") {
                query.status = "disabled";
            }

            if (listAdminUsersDto.search) {
                const searchRegex = new RegExp(listAdminUsersDto.search, "i");
                query.$and = [
                    ...(query.$and || []),
                    {
                        $or: [
                            { name: searchRegex },
                            { email: searchRegex },
                        ],
                    },
                ];
            }

            const total = await UserModel.countDocuments(query);
            const skip = (listAdminUsersDto.page - 1) * listAdminUsersDto.limit;

            const users = await UserModel.find(query)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(listAdminUsersDto.limit);

            return {
                items: users.map((user: any) => this.mapUser(user)),
                pagination: {
                    page: listAdminUsersDto.page,
                    limit: listAdminUsersDto.limit,
                    total,
                    pages: total === 0 ? 0 : Math.ceil(total / listAdminUsersDto.limit),
                },
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async getUserById(userId: string) {
        try {
            const user = await this.getManageableUserById(userId);

            return {
                user: this.mapUser(user),
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async createUser(createAdminUserDto: CreateAdminUserDto) {
        try {
            const exists = await UserModel.findOne({ email: createAdminUserDto.email });
            if (exists) throw CustomError.badRequest("Email already exist");

            const user = new UserModel({
                name: createAdminUserDto.name,
                email: createAdminUserDto.email,
                password: bcryptAdapter.hash(createAdminUserDto.password),
                role: "STANDARD",
                status: "active",
            });

            await user.save();

            return {
                user: this.mapUser(user),
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async updateUser(userId: string, updateAdminUserDto: UpdateAdminUserDto) {
        try {
            const user = await this.getManageableUserById(userId);

            if (updateAdminUserDto.email && updateAdminUserDto.email !== user.email) {
                const exists = await UserModel.findOne({
                    email: updateAdminUserDto.email,
                    _id: { $ne: user._id },
                });
                if (exists) throw CustomError.badRequest("Email already exist");
            }

            if (updateAdminUserDto.name !== undefined) user.name = updateAdminUserDto.name;
            if (updateAdminUserDto.email !== undefined) user.email = updateAdminUserDto.email;

            await user.save();

            return {
                user: this.mapUser(user),
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async deactivateUser(userId: string) {
        try {
            const user = await this.getManageableUserById(userId);

            if (user.status !== "disabled") {
                user.status = "disabled";
                await user.save();
            }

            const revokedSessions = await revokeAllUserSessions(String(user._id));

            return {
                user: this.mapUser(user),
                revokedSessions,
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async getUserPermissions(userId: string) {
        try {
            const user = await this.getManageableUserById(userId);
            return await this.buildUserPermissionsView(user);
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }
    }

    async updateUserPermissions(userId: string, updateAdminUserPermissionsDto: UpdateAdminUserPermissionsDto) {
        if (updateAdminUserPermissionsDto.globalRole !== "STANDARD") {
            throw CustomError.badRequest("Only STANDARD globalRole is allowed in this endpoint");
        }

        const user = await this.getManageableUserById(userId);
        const session = await mongoose.startSession();

        try {
            try {
                await session.withTransaction(async () => {
                    await this.syncUserPermissions(user, updateAdminUserPermissionsDto, session);
                });
            } catch (error) {
                if (!this.isTransactionNotSupportedError(error)) {
                    throw error;
                }

                await this.syncUserPermissions(user, updateAdminUserPermissionsDto);
            }

            return await this.buildUserPermissionsView(user);
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        } finally {
            await session.endSession();
        }
    }
}
