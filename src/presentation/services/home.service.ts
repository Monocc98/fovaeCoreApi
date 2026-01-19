// import { Validators } from "../../config";
// import { MembershipModel } from "../../data";
// import { CustomError } from "../../domain";


// export class HomeService {
    
//     // DI
//     constructor () {}

//     async getHomeOverview( userId: string ) {
//         const uid = Validators.convertToUid(userId);

//         // console.log(uid);
        

//         try {

//             const [overview] = await MembershipModel.aggregate([
//                 { $match: { user: uid /*, status: 'active'*/ } },

//                 { $lookup: {
//                     from: 'companies',
//                     localField: 'company',
//                     foreignField: '_id',
//                     as: 'company',
//                 }},
//                 { $unwind: '$company' },

//                 { $lookup: {
//                     from: 'groups',
//                     localField: 'company.group',
//                     foreignField: '_id',
//                     as: 'group',
//                 }},
//                 { $unwind: '$group' },

//                 // 🔹 NEW: traer las cuentas de la company + su balance
//                 {
//                 $lookup: {
//                     from: 'accounts',
//                     let: { companyId: '$company._id' },
//                     pipeline: [
//                     // Asegúrate que el campo en Account sea 'company'
//                     { $match: { $expr: { $eq: ['$company', '$$companyId'] } } },

//                     // balance por _id (mismo _id en account_balances)
//                     {
//                         $lookup: {
//                         from: 'accountbalances',
//                         localField: '_id',
//                         foreignField: '_id',
//                         as: 'balanceDoc',
//                         },
//                     },

//                     // balance como Number (dejaste number en el modelo)
//                     {
//                         $addFields: {
//                             balance: {
//                                 $toDouble: { $ifNull: [ { $arrayElemAt: ['$balanceDoc.balance', 0] }, 0 ] }
//                             }
//                         }
//                     },

//                     // proyecta SOLO lo que quieras devolver
//                     {
//                         $project: {
//                         _id: 1,
//                         name: 1,          // ajusta a tus campos reales del Account
//                         type: 1,          // si no existe en tu esquema, bórralo
//                         balance: 1
//                         }
//                     },
//                     ],
//                     as: 'companyAccounts',
//                 }
//                 },
//                 {
//                     $addFields: {
//                         companyTotal: {
//                         $sum: {
//                             $map: {
//                             input: { $ifNull: ['$companyAccounts', []] }, // evita null si no hay cuentas
//                             as: 'acc',
//                             in: { $ifNull: ['$$acc.balance', 0] }          // suma el number que ya calculaste
//                             }
//                         }
//                         }
//                     }
//                     },
//                 { $lookup: {
//                     from: 'users',
//                     localField: 'user',
//                     foreignField: '_id',
//                     as: 'userDoc',
//                 }},
//                 { $unwind: '$userDoc' },

//                 // 🔧 CHANGE: ahora companies incluye también las accounts
//                 {
//                 $group: {
//                     _id: '$group._id',
//                     groupName: { $first: '$group.name' },
//                     companies: {
//                     $addToSet: {
//                         _id: '$company._id',
//                         name: '$company.name',
//                         accounts: '$companyAccounts', // << aquí viajan las cuentas
//                         balance: '$companyTotal' // ⬅️ aquí va el total dentro de compa
//                     }
//                     },
//                     userDoc: {
//                     $first: { _id: '$userDoc._id', name: '$userDoc.name', email: '$userDoc.email' },
//                     },
//                 }
//                 },
//                 // 5.1) ⬇️ NEW: total del grupo sumando los totals de sus companies
// {
//                 $addFields: {
//                     groupbalance: {
//                     $sum: {
//                         $map: {
//                         input: { $ifNull: ['$companies', []] },
//                         as: 'comp',
//                         in: { $ifNull: ['$$comp.balance', 0] }
//                         }
//                     }
//                     }
//                 }
//                 },

                

//                 {
//                 $group: {
//                     _id: '$userDoc._id',
//                     user: { $first: '$userDoc' },
//                     groups: {
//                     $push: { _id: '$_id', name: '$groupName', balance: '$groupbalance', companies: '$companies' },
//                     },
//                 }
//                 },

//                 { $project: { _id: 0, user: 1, groups: 1 } },
//             ]);
            

//             return overview ?? { user: null, groups: [] };
            
//         } catch (error) {
//             console.log(error);
            
//             throw CustomError.internalServer('Internal Server Error');
//         }

//     }

// }
import { Validators } from "../../config";
import { MembershipModel } from "../../data";
import { CustomError } from "../../domain";

export class HomeService {
  constructor() {}

  async getHomeOverview(userId: string) {
    const uid = Validators.convertToUid(userId);

    try {
      const [overview] = await MembershipModel.aggregate([
        { $match: { user: uid } },

        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "company",
          },
        },
        { $unwind: "$company" },

        {
          $lookup: {
            from: "groups",
            localField: "company.group",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },

        // ✅ Traer cuentas de la company + totals calculados desde movements
        {
          $lookup: {
            from: "accounts",
            let: { companyId: "$company._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },

              // ✅ totals por cuenta = SUM / ingresos / egresos
              {
                $lookup: {
                  from: "movements",
                  let: { accountId: "$_id" },
                  pipeline: [
                    { $match: { $expr: { $eq: ["$account", "$$accountId"] } } },
                    {
                      $group: {
                        _id: null,
                        balance: { $sum: "$amount" },
                        ingresos: {
                          $sum: {
                            $cond: [{ $gt: ["$amount", 0] }, "$amount", 0],
                          },
                        },
                        egresos: {
                          $sum: {
                            $cond: [
                              { $lt: ["$amount", 0] },
                              { $abs: "$amount" },
                              0,
                            ],
                          },
                        },
                      },
                    },
                  ],
                  as: "totalsDoc",
                },
              },

              // ✅ flatten + number
              {
                $addFields: {
                  balance: {
                    $toDouble: {
                      $ifNull: [{ $arrayElemAt: ["$totalsDoc.balance", 0] }, 0],
                    },
                  },
                  ingresos: {
                    $toDouble: {
                      $ifNull: [
                        { $arrayElemAt: ["$totalsDoc.ingresos", 0] },
                        0,
                      ],
                    },
                  },
                  egresos: {
                    $toDouble: {
                      $ifNull: [
                        { $arrayElemAt: ["$totalsDoc.egresos", 0] },
                        0,
                      ],
                    },
                  },
                },
              },

              { $unset: "totalsDoc" },

              {
                $project: {
                  _id: 1,
                  name: 1,
                  type: 1, // borra si no existe
                  balance: 1,
                  ingresos: 1,
                  egresos: 1,
                },
              },
            ],
            as: "companyAccounts",
          },
        },

        // ✅ total de la company sumando cuentas
        {
          $addFields: {
            companyTotal: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companyAccounts", []] },
                  as: "acc",
                  in: { $ifNull: ["$$acc.balance", 0] },
                },
              },
            },
            companyIngresos: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companyAccounts", []] },
                  as: "acc",
                  in: { $ifNull: ["$$acc.ingresos", 0] },
                },
              },
            },
            companyEgresos: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companyAccounts", []] },
                  as: "acc",
                  in: { $ifNull: ["$$acc.egresos", 0] },
                },
              },
            },
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDoc",
          },
        },
        { $unwind: "$userDoc" },

        // ✅ agrupar por grupo: companies con accounts ya incluidas
        {
          $group: {
            _id: "$group._id",
            groupName: { $first: "$group.name" },
            companies: {
              $addToSet: {
                _id: "$company._id",
                name: "$company.name",
                accounts: "$companyAccounts",
                balance: "$companyTotal",
                ingresos: "$companyIngresos",
                egresos: "$companyEgresos",
              },
            },
            userDoc: {
              $first: {
                _id: "$userDoc._id",
                name: "$userDoc.name",
                email: "$userDoc.email",
              },
            },
          },
        },

        // ✅ totales del grupo sumando companies
        {
          $addFields: {
            groupbalance: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companies", []] },
                  as: "comp",
                  in: { $ifNull: ["$$comp.balance", 0] },
                },
              },
            },
            groupIngresos: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companies", []] },
                  as: "comp",
                  in: { $ifNull: ["$$comp.ingresos", 0] },
                },
              },
            },
            groupEgresos: {
              $sum: {
                $map: {
                  input: { $ifNull: ["$companies", []] },
                  as: "comp",
                  in: { $ifNull: ["$$comp.egresos", 0] },
                },
              },
            },
          },
        },

        // ✅ agrupar por usuario final
        {
          $group: {
            _id: "$userDoc._id",
            user: { $first: "$userDoc" },
            groups: {
              $push: {
                _id: "$_id",
                name: "$groupName",
                balance: "$groupbalance",
                ingresos: "$groupIngresos",
                egresos: "$groupEgresos",
                companies: "$companies",
              },
            },
          },
        },

        { $project: { _id: 0, user: 1, groups: 1 } },
      ]);

      return overview ?? { user: null, groups: [] };
    } catch (error) {
      console.log(error);
      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async getCompanyBudgetVsActual(userId: string) {
    const uid = Validators.convertToUid(userId);

    try {
      const [overview] = await MembershipModel.aggregate([
        { $match: { user: uid } },

        // company
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "company",
          },
        },
        { $unwind: "$company" },

        // group
        {
          $lookup: {
            from: "groups",
            localField: "company.group",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },

        // ===== FY ACTIVE LINK (FiscalYear_Company) =====
        {
          $lookup: {
            from: "fiscalyear_companies", // 🔧 ajusta al nombre REAL de tu colección
            let: { companyId: "$company._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },

              // 🔧 ajusta esto a tu lógica de "activo"
              // si tienes active:true:
              { $match: { active: true } },

              {
                $lookup: {
                  from: "fiscalyears",
                  localField: "fiscalYear",
                  foreignField: "_id",
                  as: "fiscalYear",
                },
              },
              { $unwind: "$fiscalYear" },

              // start/end fechas
              {
                $addFields: {
                  fyStart: "$fiscalYear.startDate",
                  fyEnd: {
                    $ifNull: [
                      "$fiscalYear.endDate",
                      {
                        // si no hay endDate: start + 12 meses
                        $dateAdd: {
                          startDate: "$fiscalYear.startDate",
                          unit: "month",
                          amount: 12,
                        },
                      },
                    ],
                  },
                  startMonth: { $add: [{ $month: "$fiscalYear.startDate" }, 0] }, // 1..12
                  startYear: { $year: "$fiscalYear.startDate" },
                },
              },

              {
                $project: {
                  _id: 1,
                  budgetLocked: 1,
                  fyStart: 1,
                  fyEnd: 1,
                  startMonth: 1,
                  startYear: 1,
                  fiscalYear: {
                    _id: "$fiscalYear._id",
                    name: "$fiscalYear.name",
                    startDate: "$fiscalYear.startDate",
                    endDate: "$fiscalYear.endDate",
                  },
                },
              },
            ],
            as: "fyLink",
          },
        },
        {
          $addFields: {
            fyLink: { $arrayElemAt: ["$fyLink", 0] }, // puede ser null si no hay FY activo
          },
        },

        // ===== accounts de la company (para sumar movements) =====
        {
          $lookup: {
            from: "accounts",
            let: { companyId: "$company._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },
              { $project: { _id: 1 } },
            ],
            as: "accountsMini",
          },
        },
        {
          $addFields: {
            accountIds: {
              $map: {
                input: { $ifNull: ["$accountsMini", []] },
                as: "a",
                in: "$$a._id",
              },
            },
          },
        },

        // ===== actual mensual desde movements =====
        {
          $lookup: {
            from: "movements",
            let: {
              accountIds: "$accountIds",
              fyStart: "$fyLink.fyStart",
              fyEnd: "$fyLink.fyEnd",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$account", "$$accountIds"] },
                      { $gte: ["$occurredAt", "$$fyStart"] },
                      { $lt: ["$occurredAt", "$$fyEnd"] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: { y: { $year: "$occurredAt" }, m: { $month: "$occurredAt" } },
                  actual: { $sum: "$amount" }, // ✅ neto (negativos abajo de 0)
                },
              },
            ],
            as: "actualByMonth",
          },
        },

        // ===== budget mensual desde budgets =====
        {
          $lookup: {
            from: "budgets",
            let: { companyId: "$company._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },
              {
                $group: {
                  _id: { y: "$year", m: "$month" },
                  budget: { $sum: "$amount" },
                },
              },
            ],
            as: "budgetByMonth",
          },
        },

        // ===== construir 12 meses fiscales con map =====
        {
          $addFields: {
            budgetVsActual: {
              $cond: [
                { $ifNull: ["$fyLink", false] },
                {
                  $map: {
                    input: { $range: [0, 12] }, // 0..11
                    as: "i",
                    in: {
                      $let: {
                        vars: {
                          calMonth: {
                            $add: [
                              1,
                              {
                                $mod: [
                                  { $add: [{ $subtract: ["$fyLink.startMonth", 1] }, "$$i"] },
                                  12,
                                ],
                              },
                            ],
                          },
                        },
                        in: {
                          $let: {
                            vars: {
                              year: {
                                $add: [
                                  "$fyLink.startYear",
                                  {
                                    $cond: [{ $lt: ["$$calMonth", "$fyLink.startMonth"] }, 1, 0],
                                  },
                                ],
                              },
                              bObj: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$budgetByMonth",
                                      as: "b",
                                      cond: {
                                        $and: [
                                          { $eq: ["$$b._id.y", {
                                            $add: [
                                              "$fyLink.startYear",
                                              { $cond: [{ $lt: ["$$calMonth", "$fyLink.startMonth"] }, 1, 0] },
                                            ],
                                          }]},
                                          { $eq: ["$$b._id.m", "$$calMonth"] },
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                              aObj: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$actualByMonth",
                                      as: "a",
                                      cond: {
                                        $and: [
                                          { $eq: ["$$a._id.y", {
                                            $add: [
                                              "$fyLink.startYear",
                                              { $cond: [{ $lt: ["$$calMonth", "$fyLink.startMonth"] }, 1, 0] },
                                            ],
                                          }]},
                                          { $eq: ["$$a._id.m", "$$calMonth"] },
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: {
                              fiscalPos: { $add: ["$$i", 1] },
                              calMonth: "$$calMonth",
                              year: "$$year",
                              budget: { $ifNull: ["$$bObj.budget", 0] },
                              actual: { $ifNull: ["$$aObj.actual", 0] },
                              diff: {
                                $subtract: [
                                  { $ifNull: ["$$aObj.actual", 0] },
                                  { $ifNull: ["$$bObj.budget", 0] },
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                [], // si no hay FY activo
              ],
            },
            budgetLocked: { $ifNull: ["$fyLink.budgetLocked", false] },
          },
        },

        // ===== agrupar a estructura tipo homeoverview =====
        {
          $group: {
            _id: "$group._id",
            groupName: { $first: "$group.name" },
            companies: {
              $addToSet: {
                _id: "$company._id",
                name: "$company.name",
                fiscalYear: "$fyLink.fiscalYear",
                budgetLocked: "$budgetLocked",
                budgetVsActual: "$budgetVsActual",
              },
            },
          },
        },

        { $project: { _id: 1, name: "$groupName", companies: 1 } },
      ]);

      return overview ?? { groups: [] };
    } catch (error) {
      console.log(error);
      throw CustomError.internalServer("Internal Server Error");
    }
  }

}