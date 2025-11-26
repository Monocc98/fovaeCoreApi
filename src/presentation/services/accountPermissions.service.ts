
import { AccountPermissionsModel } from "../../data/mongo/models/account_permissions.model";
import { CustomError } from "../../domain";
import { CreateAccountPermissionsDto } from "../../domain/dtos/account/accountPermissions.dto";


export class AccountPermissionsService {
    
    // DI
    constructor () {}

    async createAccountPermissions( createAccountPermissionsDto: CreateAccountPermissionsDto ) {

        const accountPermissionsExists = await AccountPermissionsModel.findOne({ membership: createAccountPermissionsDto.membership, account: createAccountPermissionsDto.account});
        if ( accountPermissionsExists ) throw CustomError.badRequest( 'accountPermissions already exists' );

        try {

            const accountPermissions = new AccountPermissionsModel({
                ...createAccountPermissionsDto,
            });

            await accountPermissions.save();

            return {
                accountPermissions
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getAccountPermissions() {

        try {

            const accountPermissions = await AccountPermissionsModel.find()
                .populate('membership') // si quieres ver el membership
                .populate('account', 'id name'); // si quieres ver info de la cuenta

            return {
                accountPermissions
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}