

import { Validators } from "../../config";
import { AccountBalancesModel, AccountModel } from "../../data";
import { CreateAccountDto, CustomError, UpdateAccountDto } from "../../domain";
import { CreateAccountBalanceDto } from "../../domain/dtos/account/accountBalances.dto";


export class AccountService {
    
    // DI
    constructor () {}

    async createAccount( createAccountDto: CreateAccountDto ) {

        //TODO Poner una manera de que se puedan repetir nombres fuera de la misma empresa
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

    async getAccountsByIdCompany(idCompany: string) {

        try {
        
            if(!Validators.isMongoID(idCompany)) throw CustomError.badRequest('Invalid company ID');
            const companyIdMongo = Validators.convertToUid(idCompany);

            const accounts = await AccountModel.find({ company: companyIdMongo })
                .populate('company')

            return {
                accounts,
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }
                

    }

        async updateAccount( idAccount: string, updateAccountDto: UpdateAccountDto ) {
    
            try {
    
                if(!Validators.isMongoID(idAccount)) throw CustomError.badRequest('Invalid account ID');
                const accountIdMongo = Validators.convertToUid(idAccount);
    
                const prevAccount = await AccountModel.findById(accountIdMongo);
                if (!prevAccount) throw CustomError.notFound('Account not found');
    
                const updatedAccount = await AccountModel.findByIdAndUpdate(
                    accountIdMongo,
                    { ...updateAccountDto },
                    { new: true }
                );
                
            } catch (error) {
                throw CustomError.internalServer(`${ error }`);
            }
    
        } 
    
        async deleteAccount( idAccount: string ) {
    
            try {
    
                if(!Validators.isMongoID(idAccount)) throw CustomError.badRequest('Invalid account ID');
                const accountIdMongo = Validators.convertToUid(idAccount);
    
                const prevAccount = await AccountModel.findById(accountIdMongo);
                if (!prevAccount) throw CustomError.notFound('Account not found');

                const deletedAccount = await AccountModel.findByIdAndDelete(accountIdMongo);
    
                return {deletedAccount};
                
            } catch (error) {
                throw CustomError.internalServer(`${ error }`);
            }
    
        } 
    

}