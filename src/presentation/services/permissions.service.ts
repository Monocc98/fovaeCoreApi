// src/presentation/services/permissions.service.ts
import { MembershipModel } from "../../data";
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import { AccountModel } from "../../data"; // ajusta si tu AccountModel está en otra ruta

type GlobalRole = "SUPER_ADMIN" | "STANDARD";
type BaseRole = "ADMIN" | "VIEWER";

interface MinimalUserForPermissions {
  id: string;
  role: string; // 'STANDARD' | 'SUPER_ADMIN'
}

export const buildPermissionsForUser = async (user: MinimalUserForPermissions) => {
  // 1) Rol global
  const globalRole: GlobalRole =
    user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STANDARD";

  // SUPER_ADMIN → el front interpretará esto como "todo permitido"
  if (globalRole === "SUPER_ADMIN") {
    return {
      globalRole,
      companyPermissions: [] as any[],
    };
  }

  // 2) Memberships del usuario
  const memberships = await MembershipModel.find({
    user: user.id,
    status: "active",
  }).lean();

  // 3) Para cada membership, calcular permisos por empresa + cuentas
  const companyPermissions = await Promise.all(
    memberships.map(async (m) => {
      const companyId = m.company.toString();
      const baseRole: BaseRole = (m.role as BaseRole) || "VIEWER"; // m.role es 'ADMIN' | 'VIEWER'

      // ❗ Aquí quitamos Promise.all para evitar TS2590
      const accounts = await AccountModel.find({ company: m.company }).lean();
      const accountPerms = await AccountPermissionsModel.find({
        membership: m._id,
      }).lean();

      const accountsPerm = accounts.map((acc) => {
        const accountId = acc._id.toString();

        const override = accountPerms.find(
          (ap) => ap.account.toString() === accountId
        );

        // Permisos base según el role de membership
        let canView = true; // ADMIN y VIEWER pueden ver
        let canEdit = baseRole === "ADMIN";

        // Override a nivel cuenta, si existe
        if (override) {
          canView = override.canView;
          canEdit = override.canEdit;
        }

        return {
          accountId,
          canView,
          canEdit,
        };
      });

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
