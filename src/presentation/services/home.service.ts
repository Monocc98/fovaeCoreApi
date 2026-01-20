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

      // user
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: "$userDoc" },

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

      // ============================================================
      // ✅ FY "EN CURSO" POR COMPANY (pivot fiscalyear_companies)
      // ============================================================
      {
        $lookup: {
          from: "fiscalyear_companies", // 👈 AJUSTA si tu colección se llama diferente
          let: { companyId: "$company._id", now: "$$NOW" },
          pipeline: [
            { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },

            // populate fy
            {
              $lookup: {
                from: "fiscalyears",
                localField: "fiscalYear",
                foreignField: "_id",
                as: "fy",
              },
            },
            { $addFields: { fy: { $arrayElemAt: ["$fy", 0] } } },

            // fyEnd fallback = start + 12 meses
            {
              $addFields: {
                fyEnd: {
                  $ifNull: [
                    "$fy.endDate",
                    {
                      $dateAdd: {
                        startDate: "$fy.startDate",
                        unit: "month",
                        amount: 12,
                      },
                    },
                  ],
                },
              },
            },

            // ✅ solo el FY que contiene "hoy"
            {
              $match: {
                $expr: {
                  $and: [
                    { $lte: ["$fy.startDate", "$$now"] },
                    { $gt: ["$fyEnd", "$$now"] },
                  ],
                },
              },
            },

            { $sort: { "fy.startDate": -1 } },
            { $limit: 1 },

            {
              $project: {
                _id: 1,
                budgetLocked: 1,
                fiscalYear: "$fy",
                fyEnd: 1,
              },
            },
          ],
          as: "fyLink",
        },
      },
      { $addFields: { fyLink: { $arrayElemAt: ["$fyLink", 0] } } },

      // derivar fechas/mes inicio por company (si no hay FY, quedan null)
      {
        $addFields: {
          fy: "$fyLink.fiscalYear",
          fyStart: "$fyLink.fiscalYear.startDate",
          fyEnd: "$fyLink.fyEnd",
          startMonth: { $month: "$fyLink.fiscalYear.startDate" },
          startYear: { $year: "$fyLink.fiscalYear.startDate" },
          budgetLocked: { $ifNull: ["$fyLink.budgetLocked", false] },
          fyId: "$fyLink.fiscalYear._id",
        },
      },

      // ===== accounts de la company =====
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

      // ===== actual mensual (movements) dentro del FY =====
      {
        $lookup: {
          from: "movements",
          let: { accountIds: "$accountIds", fyStart: "$fyStart", fyEnd: "$fyEnd" },
          pipeline: [
            // si no hay FY => no trae nada
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$$fyStart", null] },
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
                actual: { $sum: "$amount" }, // neto
              },
            },
          ],
          as: "actualByMonth",
        },
      },

      // ===== budget mensual (budgets) por company =====
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

      // ===== construir 12 meses fiscales company-level =====
      {
        $addFields: {
          budgetVsActual: {
            $cond: [
              { $ne: ["$fyStart", null] },
              {
                $map: {
                  input: { $range: [0, 12] },
                  as: "i",
                  in: {
                    $let: {
                      vars: {
                        calMonth: {
                          $add: [
                            1,
                            {
                              $mod: [
                                { $add: [{ $subtract: ["$startMonth", 1] }, "$$i"] },
                                12,
                              ],
                            },
                          ],
                        },
                        year: {
                          $add: [
                            "$startYear",
                            {
                              $cond: [
                                {
                                  $lt: [
                                    {
                                      $add: [
                                        1,
                                        {
                                          $mod: [
                                            { $add: [{ $subtract: ["$startMonth", 1] }, "$$i"] },
                                            12,
                                          ],
                                        },
                                      ],
                                    },
                                    "$startMonth",
                                  ],
                                },
                                1,
                                0,
                              ],
                            },
                          ],
                        },
                      },
                      in: {
                        $let: {
                          vars: {
                            bObj: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$budgetByMonth",
                                    as: "b",
                                    cond: {
                                      $and: [
                                        { $eq: ["$$b._id.y", "$$year"] },
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
                                        { $eq: ["$$a._id.y", "$$year"] },
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
                            budget: { $toDouble: { $ifNull: ["$$bObj.budget", 0] } },
                            actual: { $toDouble: { $ifNull: ["$$aObj.actual", 0] } },
                            diff: {
                              $subtract: [
                                { $toDouble: { $ifNull: ["$$aObj.actual", 0] } },
                                { $toDouble: { $ifNull: ["$$bObj.budget", 0] } },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              [],
            ],
          },
        },
      },

      // totals por company (sumables hacia arriba)
      {
        $addFields: {
          companyBudgetTotal: {
            $sum: {
              $map: { input: "$budgetVsActual", as: "x", in: { $ifNull: ["$$x.budget", 0] } },
            },
          },
          companyActualTotal: {
            $sum: {
              $map: { input: "$budgetVsActual", as: "x", in: { $ifNull: ["$$x.actual", 0] } },
            },
          },
        },
      },

      // ============================================================
      // ✅ agrupar por group con companies
      // ============================================================
      {
        $group: {
          _id: "$group._id",
          groupName: { $first: "$group.name" },

          userDoc: {
            $first: {
              _id: "$userDoc._id",
              name: "$userDoc.name",
              email: "$userDoc.email",
            },
          },

          companies: {
            $addToSet: {
              _id: "$company._id",
              name: "$company.name",
              fiscalYear: {
                _id: "$fy._id",
                name: "$fy.name",
                startDate: "$fy.startDate",
                endDate: "$fy.endDate",
              },
              budgetLocked: "$budgetLocked",
              budgetTotal: "$companyBudgetTotal",
              actualTotal: "$companyActualTotal",
              budgetVsActual: "$budgetVsActual",
            },
          },

          // para saber si pueden sumarse mes-a-mes en el group
          fyIds: { $addToSet: "$fyId" },
        },
      },

      // ============================================================
      // ✅ totales del group + budgetVsActual (solo si FY es único)
      // ============================================================
      {
        $addFields: {
          budgetTotal: {
            $sum: {
              $map: { input: "$companies", as: "c", in: { $ifNull: ["$$c.budgetTotal", 0] } },
            },
          },
          actualTotal: {
            $sum: {
              $map: { input: "$companies", as: "c", in: { $ifNull: ["$$c.actualTotal", 0] } },
            },
          },

          // ✅ solo si todas comparten FY (fyIds size == 1)
          budgetVsActual: {
            $cond: [
              { $eq: [{ $size: { $ifNull: ["$fyIds", []] } }, 1] },
              {
                $map: {
                  input: { $range: [0, 12] },
                  as: "i",
                  in: {
                    $let: {
                      vars: {
                        firstRow: {
                          $arrayElemAt: [
                            { $ifNull: [{ $arrayElemAt: ["$companies.budgetVsActual", 0] }, []] },
                            "$$i",
                          ],
                        },
                        sumBudget: {
                          $sum: {
                            $map: {
                              input: "$companies",
                              as: "c",
                              in: {
                                $ifNull: [{ $arrayElemAt: ["$$c.budgetVsActual.budget", "$$i"] }, 0],
                              },
                            },
                          },
                        },
                        sumActual: {
                          $sum: {
                            $map: {
                              input: "$companies",
                              as: "c",
                              in: {
                                $ifNull: [{ $arrayElemAt: ["$$c.budgetVsActual.actual", "$$i"] }, 0],
                              },
                            },
                          },
                        },
                      },
                      in: {
                        fiscalPos: { $ifNull: ["$$firstRow.fiscalPos", { $add: ["$$i", 1] }] },
                        calMonth: "$$firstRow.calMonth",
                        year: "$$firstRow.year",
                        budget: "$$sumBudget",
                        actual: "$$sumActual",
                        diff: { $subtract: ["$$sumActual", "$$sumBudget"] },
                      },
                    },
                  },
                },
              },
              [],
            ],
          },
        },
      },

      // ============================================================
      // ✅ agrupar final como home: {user, groups: []}
      // ============================================================
      {
        $group: {
          _id: "$userDoc._id",
          user: { $first: "$userDoc" },
          groups: {
            $push: {
              _id: "$_id",
              name: "$groupName",
              budgetTotal: "$budgetTotal",
              actualTotal: "$actualTotal",
              budgetVsActual: "$budgetVsActual",
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


}