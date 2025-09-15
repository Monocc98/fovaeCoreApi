

import { AccountBalancesModel, AccountModel } from "../../data";
import { CreateAccountDto, CustomError } from "../../domain";
import { CreateAccountBalanceDto } from "../../domain/dtos/account/accountBalances.dto";


export class AccountService {
    
    // DI
    constructor () {}

    async createAccount( createAccountDto: CreateAccountDto ) {

        const accountExists = await AccountModel.findOne({ name: createAccountDto.name });
        if ( accountExists ) throw CustomError.badRequest( 'Account already exists' );

        try {

            const account = new AccountModel({
                ...createAccountDto,
            });

            await account.save();

            return {
                account
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    }

    async createAccountBalances( createAccountBalancesDto: CreateAccountBalanceDto ) {

        try {

            const accountBalance = new AccountBalancesModel({
                ...createAccountBalancesDto,
            });

            await accountBalance.save();

            return {
                accountBalance
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    }

    async getAccounts() {

        try {

            const acccounts = await AccountModel.find()
                .populate('company')
            

            // const groupsEntity = GroupEntity.fromArray(groups);
            

            return {
                accounts: acccounts
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}