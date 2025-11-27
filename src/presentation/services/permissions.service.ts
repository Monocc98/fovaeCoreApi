// src/presentation/services/permissions.service.ts
import { MembershipModel } from "../../data";
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import { AccountModel } from "../../data";

type GlobalRole = "SUPER_ADMIN" | "STANDARD";
type BaseRole = "ADMIN" | "VIEWER";

export const buildPermissionsForUser = async (user: { id: string; role: string }) => {
  // 1) Rol global basado en el campo role del usuario
  const globalRole: GlobalRole =
    user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STANDARD";

  // Si es SUPER_ADMIN, el front lo puede interpretar como "todo permitido"
  if (globalRole === "SUPER_ADMIN") {
    return {
      globalRole,
      companyPermissions: [] as any[],
    };
  }

  // 2) Memberships del usuario (empresas donde tiene acceso)
  const memberships = (await MembershipModel.find({
    user: user.id,
    status: "active",
  }).lean().exec()) as any[];

  const companyPermissions: {
    companyId: string;
    baseRole: BaseRole;
    accounts: { accountId: string; canView: boolean; canEdit: boolean }[];
  }[] = [];

  // 3) Recorremos memberships uno por uno (sin Promise.all, sin map)
  for (const m of memberships) {
    const companyId = m.company.toString();
    const baseRole: BaseRole = m.role === "ADMIN" ? "ADMIN" : "VIEWER";

    // 3.1) Cuentas de la empresa
    const accounts = (await AccountModel.find({
      company: m.company,
    }).lean().exec()) as any[];

    // 3.2) Overrides de permisos por cuenta para este membership
    const accountPerms = (await AccountPermissionsModel.find({
      membership: m._id,
    }).lean().exec()) as any[];

    const accountsPerm: { accountId: string; canView: boolean; canEdit: boolean }[] = [];

    // 3.3) Por cada cuenta, calculamos permisos efectivos
    for (const acc of accounts as any[]) {
  const accountId = acc._id.toString();

  // Buscar override para esta cuenta en este membership
  let override: any = null;
  for (const ap of accountPerms as any[]) {
    if (ap.account.toString() === accountId) {
      override = ap;
      break;
    }
  }

  // Permisos base según role de membership
  let canView = true;                 // ADMIN y VIEWER siempre ven
  let canEdit = baseRole === "ADMIN"; // solo ADMIN edita por defecto

  // 🔥 Si hay override, manda lo que diga la BD SIN condiciones raras
  if (override) {
    canView = !!override.canView;
    canEdit = !!override.canEdit;
  }
  
  accountsPerm.push({
    accountId,
    canView,
    canEdit,
  });
}


    companyPermissions.push({
      companyId,
      baseRole,
      accounts: accountsPerm,
    });
  }

  // 4) Resultado final
  return {
    globalRole,
    companyPermissions,
  };
};
