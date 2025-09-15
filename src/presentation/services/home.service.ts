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
                // 1) memberships del usuario
                { $match: { user: uid /*, status: 'active'*/ } },

                // 2) traer company
                {
                    $lookup: {
                    from: 'companies',
                    localField: 'company',
                    foreignField: '_id',
                    as: 'company',
                    },
                },
                { $unwind: '$company' },

                // 3) traer group de la company
                {
                    $lookup: {
                    from: 'groups',
                    localField: 'company.group',
                    foreignField: '_id',
                    as: 'group',
                    },
                },
                { $unwind: '$group' },

                // 4) traer datos básicos del user (si los necesitas en la salida)
                {
                    $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDoc',
                    },
                },
                { $unwind: '$userDoc' },

                // 5) **AGRUPAR POR GRUPO** (AQUÍ se separan bien las compañías por grupo)
                {
                    $group: {
                    _id: '$group._id',                       // ✅ clave: agrupar por el ID del grupo
                    groupName: { $first: '$group.name' },
                    companies: {
                        $addToSet: { _id: '$company._id', name: '$company.name' },
                    },
                    userDoc: {                                // conservamos el user para el siguiente step
                        $first: { _id: '$userDoc._id', name: '$userDoc.name', email: '$userDoc.email' },
                    },
                    },
                },

                // 6) **REAGRUPAR POR USUARIO** y armar el array groups
                {
                    $group: {
                    _id: '$userDoc._id',                      // ✅ ahora sí, por usuario
                    user: { $first: '$userDoc' },
                    groups: {
                        $push: { _id: '$_id', name: '$groupName', companies: '$companies' },
                    },
                    },
                },

                // 7) proyección final
                { $project: { _id: 0, user: 1, groups: 1 } },
            ])
            

            // const groupsEntity = GroupEntity.fromArray(groups);
            
            console.log(overview);
            

            return overview ?? { user: null, groups: [] };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}