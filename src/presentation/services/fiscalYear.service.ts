import { Validators } from "../../config";
import { FiscalYearModel } from "../../data/mongo/models/fiscal_year.model";
import { CustomError } from "../../domain";
import { CreateFiscalYearDto } from "../../domain/dtos/fiscalYear/fiscalYear.dto";



export class FiscalYearService {
    
    // DI
    constructor () {}

    async createFiscalYear( createFiscalYearDto: CreateFiscalYearDto ) {

        try {

            const fiscalYear = new FiscalYearModel({
                ...createFiscalYearDto,
            });

            await fiscalYear.save();
            return {
                fiscalYear
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async updateFiscalYear( idFiscalYear: string, updateFiscalYearDto: CreateFiscalYearDto ) {

        try {

            if(!Validators.isMongoID(idFiscalYear)) throw CustomError.badRequest('Invalid fiscalYear ID');
            const fiscalYearIdMongo = Validators.convertToUid(idFiscalYear);

            const prevFiscalYear = await FiscalYearModel.findById(fiscalYearIdMongo);
            if (!prevFiscalYear) throw CustomError.notFound('FiscalYear not found');



            const updatedFiscalYear = await FiscalYearModel.findByIdAndUpdate(
                fiscalYearIdMongo,
                { new: true }
            );

            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async deleteFiscalYear( idFiscalYear: string ) {

        try {

            if(!Validators.isMongoID(idFiscalYear)) throw CustomError.badRequest('Invalid fiscalYear ID');
            const fiscalYearIdMongo = Validators.convertToUid(idFiscalYear);

            const prevFiscalYear = await FiscalYearModel.findById(fiscalYearIdMongo);
            if (!prevFiscalYear) throw CustomError.notFound('FiscalYear not found');


            const deletedFiscalYear = await FiscalYearModel.findByIdAndDelete(fiscalYearIdMongo);

            return {deletedFiscalYear};
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getFiscalYears() {

        try {

            const fiscalYears = await FiscalYearModel.find()
                .populate('company')
            

            return {
                fiscalYears: fiscalYears
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getFiscalYearsByCompanyId( idCompany: string ) {

        try {

            if(!Validators.isMongoID(idCompany)) throw CustomError.badRequest('Invalid company ID');
            const accountIdMongo = Validators.convertToUid(idCompany);

            // const [fiscalYears, balanceDoc] = await Promise.all([
            //     FiscalYearModel.find({ account: accountIdMongo }).populate('category'),
            //     AccountBalancesModel.findById(accountIdMongo)
            // ]);

            // const balance = balanceDoc?.balance ?? 0;

            const fiscalYears = await FiscalYearModel.find({ company: accountIdMongo })
                .populate('company')

            return {
                fiscalYears,
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getFiscalYearsById( idFiscalYear: string ) {

        try {

            if(!Validators.isMongoID(idFiscalYear)) throw CustomError.badRequest('Invalid account ID');
            const accountIdMongo = Validators.convertToUid(idFiscalYear);

            const fiscalYear = await FiscalYearModel.findById(idFiscalYear)
                .populate('company')

            return {fiscalYear};
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}