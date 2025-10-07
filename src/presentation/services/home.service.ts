import { Validators } from "../../config";
import { MembershipModel } from "../../data";
import { CustomError } from "../../domain";


export class HomeService {
    
    // DI
    constructor () {}

    async getHomeOverview( userId: string ) {
        const uid = Validators.convertToUid(userId);

        // console.log(uid);
        

        try {

            const [overview] = await MembershipModel.aggregate([
                { $match: { user: uid /*, status: 'active'*/ } },

                { $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'company',
                }},
                { $unwind: '$company' },

                { $lookup: {
                    from: 'groups',
                    localField: 'company.group',
                    foreignField: '_id',
                    as: 'group',
                }},
                { $unwind: '$group' },

                // 🔹 NEW: traer las cuentas de la company + su balance
                {
                $lookup: {
                    from: 'accounts',
                    let: { companyId: '$company._id' },
                    pipeline: [
                    // Asegúrate que el campo en Account sea 'company'
                    { $match: { $expr: { $eq: ['$company', '$$companyId'] } } },

                    // balance por _id (mismo _id en account_balances)
                    {
                        $lookup: {
                        from: 'accountbalances',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'balanceDoc',
                        },
                    },

                    // balance como Number (dejaste number en el modelo)
                    {
                        $addFields: {
                            balance: {
                                $toDouble: { $ifNull: [ { $arrayElemAt: ['$balanceDoc.balance', 0] }, 0 ] }
                            }
                        }
                    },

                    // proyecta SOLO lo que quieras devolver
                    {
                        $project: {
                        _id: 1,
                        name: 1,          // ajusta a tus campos reales del Account
                        type: 1,          // si no existe en tu esquema, bórralo
                        balance: 1
                        }
                    },
                    ],
                    as: 'companyAccounts',
                }
                },
                {
                    $addFields: {
                        companyTotal: {
                        $sum: {
                            $map: {
                            input: { $ifNull: ['$companyAccounts', []] }, // evita null si no hay cuentas
                            as: 'acc',
                            in: { $ifNull: ['$$acc.balance', 0] }          // suma el number que ya calculaste
                            }
                        }
                        }
                    }
                    },
                { $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDoc',
                }},
                { $unwind: '$userDoc' },

                // 🔧 CHANGE: ahora companies incluye también las accounts
                {
                $group: {
                    _id: '$group._id',
                    groupName: { $first: '$group.name' },
                    companies: {
                    $addToSet: {
                        _id: '$company._id',
                        name: '$company.name',
                        accounts: '$companyAccounts', // << aquí viajan las cuentas
                        balance: '$companyTotal' // ⬅️ aquí va el total dentro de compa
                    }
                    },
                    userDoc: {
                    $first: { _id: '$userDoc._id', name: '$userDoc.name', email: '$userDoc.email' },
                    },
                }
                },
                // 5.1) ⬇️ NEW: total del grupo sumando los totals de sus companies
{
                $addFields: {
                    groupbalance: {
                    $sum: {
                        $map: {
                        input: { $ifNull: ['$companies', []] },
                        as: 'comp',
                        in: { $ifNull: ['$$comp.balance', 0] }
                        }
                    }
                    }
                }
                },

                

                {
                $group: {
                    _id: '$userDoc._id',
                    user: { $first: '$userDoc' },
                    groups: {
                    $push: { _id: '$_id', name: '$groupName', balance: '$groupbalance', companies: '$companies' },
                    },
                }
                },

                { $project: { _id: 0, user: 1, groups: 1 } },
            ]);
            

            return overview ?? { user: null, groups: [] };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}