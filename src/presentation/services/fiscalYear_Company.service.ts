import { Validators } from "../../config";
import { FiscalYear_CompanyModel } from "../../data/mongo/models/fiscalYear_Company.model";
import { CustomError } from "../../domain";
import { CreateFiscalYear_CompanyDto } from "../../domain/dtos/fiscalYear/membership.dto";


export class FiscalYear_CompanyService {
    
    // DI
    constructor () {}

    async createFiscalYear_Company( createFiscalYear_CompanyDto: CreateFiscalYear_CompanyDto ) {

        const fiscalYear_CompanyExists = await FiscalYear_CompanyModel.findOne({ fiscalYear: createFiscalYear_CompanyDto.fiscalYear, company: createFiscalYear_CompanyDto.company });
        if ( fiscalYear_CompanyExists ) throw CustomError.badRequest( 'FiscalYear_Company already exists' );

        try {

            const fiscalYear_Company = new FiscalYear_CompanyModel({
                ...createFiscalYear_CompanyDto,
            });

            await fiscalYear_Company.save();

            return {
                fiscalYear_Company
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getFiscalYears_Companies() {

        try {

            const fiscalYear_Companys = await FiscalYear_CompanyModel.find()
                .populate('company')
                .populate('user', 'id name email')

            return {
                fiscalYear_Companys
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getFiscalYears_CompaniesByCompanyId( idCompany: string ) {

        try {
            
            if(!Validators.isMongoID(idCompany)) throw CustomError.badRequest('Invalid company ID');
            const accountIdMongo = Validators.convertToUid(idCompany);

            const fiscalYears_Companies = await FiscalYear_CompanyModel.find({ company: accountIdMongo })
                .populate('company')
                .populate('fiscalYear')

            return {
                fiscalYears_Companies
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}