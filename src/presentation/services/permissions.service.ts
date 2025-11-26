// src/presentation/services/permissions.service.ts
import { MembershipModel } from "../../data";
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
// ajusta el import de AccountModel según como lo tengas
import { AccountModel } from "../../data"; 
import { UserEntity } from "../../domain";

type GlobalRole = "SUPER_ADMIN" | "STANDARD";
type BaseRole = "ADMIN" | "VIEWER";

export const buildPermissionsForUser = async (user: { id: string; role: string }) => {
  // 1) Rol global
  const globalRole: GlobalRole = user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STANDARD";

  // Si es SUPER_ADMIN, no necesitamos más detalle: en el front trataremos esto como "todo permitido"
  if (globalRole === "SUPER_ADMIN") {
    return {
      globalRole,
      companyPermissions: [] as any[],
    };
  }

  // 2) Memberships del usuario (empresas a las que tiene acceso)
  const memberships = await MembershipModel.find({
    user: user.id,
    status: "active",
  }).lean();

  // 3) Para cada membership, construir permisos por empresa + cuentas
  const companyPermissions = await Promise.all(
    memberships.map(async (m) => {
      const companyId = m.company.toString();
      const baseRole: BaseRole = (m.role as BaseRole) || "VIEWER"; // m.role es 'ADMIN' | 'VIEWER'

      // Todas las cuentas de esa empresa
      const [accounts, accountPerms] = await Promise.all([
        AccountModel.find({ company: m.company }).lean(),
        AccountPermissionsModel.find({ membership: m._id }).lean(),
      ]);

      const accountsPerm = accounts.map((acc) => {
        const accountId = acc._id.toString();

        const override = accountPerms.find(
          (ap) => ap.account.toString() === accountId
        );

        // Permisos base por empresa
        let canView = true; // tanto ADMIN como VIEWER pueden ver
        let canEdit = baseRole === "ADMIN";

        // Si hay override a nivel cuenta, manda el override
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
