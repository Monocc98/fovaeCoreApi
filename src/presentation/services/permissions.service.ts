// src/presentation/services/permissions.service.ts
import { MembershipModel } from "../../data";
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import { AccountModel } from "../../data";

type GlobalRole = "SUPER_ADMIN" | "STANDARD";
type BaseRole = "ADMIN" | "VIEWER";

type AccountPermLean = {
  account: any;
  canView: boolean;
  canEdit: boolean;
};

export const buildPermissionsForUser = async (user: { id: string; role: string }) => {
  const globalRole: GlobalRole =
    user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STANDARD";

  if (globalRole === "SUPER_ADMIN") {
    return {
      globalRole,
      companyPermissions: [] as any[],
    };
  }

  const memberships = await MembershipModel.find({
    user: user.id,
    status: "active",
  }).lean();

  const companyPermissions = await Promise.all(
    memberships.map(async (m) => {
      const companyId = m.company.toString();
      const baseRole: BaseRole = (m.role as BaseRole) || "VIEWER";

      const accounts = await AccountModel.find({ company: m.company }).lean().exec();

      const accountPerms = (await AccountPermissionsModel.find({
        membership: m._id,
      }).lean().exec()) as AccountPermLean[];

      // 🔽 AQUÍ EL CAMBIO: sin map, sin inferencia genérica rara
      const accountsPerm: { accountId: string; canView: boolean; canEdit: boolean }[] = [];

      for (const acc of accounts as any[]) {
        const accountId = acc._id.toString();

        const override = (accountPerms as any[]).find(
          (ap) => ap.account.toString() === accountId
        );

        let canView = true;
        let canEdit = baseRole === "ADMIN";

        if (override) {
          canView = override.canView;
          canEdit = override.canEdit;
        }

        accountsPerm.push({
          accountId,
          canView,
          canEdit,
        });
      }

      return {
        companyId,
        baseRole,
        accounts: accountsPerm,
      };
    })
  );

  return {
    globalRole,
    companyPermissions,
  };
};
