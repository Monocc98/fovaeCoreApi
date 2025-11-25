
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import { CustomError } from "../../domain";
import { CreateAccountPermissionsDto } from "../../domain/dtos/account/accountPermissions.dto";


export class AccountPermissionsService {
    
    // DI
    constructor () {}

    async createAccountPermissions( createAccountPermissionsDto: CreateAccountPermissionsDto ) {

        const membershipExists = await AccountPermissionsModel.findOne({ membership: createAccountPermissionsDto.membership, account: createAccountPermissionsDto.account, canView: createAccountPermissionsDto.canView, canEdit: createAccountPermissionsDto.canEdit });
        if ( membershipExists ) throw CustomError.badRequest( 'Membership already exists' );

        try {

            const membership = new AccountPermissionsModel({
                ...createAccountPermissionsDto,
            });

            await membership.save();

            return {
                membership
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getAccountPermissions() {

        try {

            const memberships = await AccountPermissionsModel.find()
                .populate('membership')
                .populate('accounts', 'id name')

            return {
                memberships
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}