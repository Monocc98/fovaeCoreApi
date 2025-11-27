

import { CompanyModel } from "../../data";
import { CreateCompanyDto, CustomError } from "../../domain";


export class CompanyService {
    
    // DI
    constructor () {}

    async createCompany( createCompanyDto: CreateCompanyDto ) {

        try {

            const companyExists = await CompanyModel.findOne({
                name: createCompanyDto.name,
                group: createCompanyDto.group,
            });

            if (companyExists) {
                throw CustomError.badRequest('Company already exists in this group');
            }

            const company = new CompanyModel({
                ...createCompanyDto,
            });

            await company.save();

            return {
                company
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getCompanies() {

        try {

            const companies = await CompanyModel.find()
                .populate('group')
            

            // const groupsEntity = GroupEntity.fromArray(groups);
            

            return {
                companies: companies
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}