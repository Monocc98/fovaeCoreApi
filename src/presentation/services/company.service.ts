
import { Validators } from "../../config";
import { CompanyModel } from "../../data";
import { MembershipModel } from "../../data/mongo/models/membership.model";
import { CreateCompanyDto, CustomError, UpdateCompanyFiscalProfileDto } from "../../domain";

type CurrentUser = {
    id: string;
    role: string;
};

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

    private async ensureCompanyAccess(companyId: string, currentUser: CurrentUser, requireAdmin: boolean) {
        if (!Validators.isMongoID(companyId)) {
            throw CustomError.badRequest("Invalid company id");
        }

        const company = await CompanyModel.findById(companyId).lean();
        if (!company) {
            throw CustomError.notFound("Company not found");
        }

        if (currentUser.role === "SUPER_ADMIN") {
            return company;
        }

        const membership = await MembershipModel.findOne({
            user: currentUser.id,
            company: companyId,
            status: "active",
        }).lean();

        if (!membership) {
            throw CustomError.forbidden("You do not have access to this company");
        }

        if (requireAdmin && membership.role !== "ADMIN") {
            throw CustomError.forbidden("Admin company access required");
        }

        return company;
    }

    private mapFiscalProfile(company: any) {
        const fiscalProfile = company?.fiscalProfile ?? {};
        const rfc = String(fiscalProfile.rfc ?? "");
        const legalName = String(fiscalProfile.legalName ?? "");
        const taxRegime = String(fiscalProfile.taxRegime ?? "");
        const fiscalZipCode = String(fiscalProfile.fiscalZipCode ?? "");

        return {
            company: {
                id: company._id?.toString?.() ?? company.id,
                name: company.name,
            },
            fiscalProfile: {
                rfc,
                legalName,
                taxRegime,
                fiscalZipCode,
                fiscalEmail: String(fiscalProfile.fiscalEmail ?? ""),
                defaultSeries: String(fiscalProfile.defaultSeries ?? ""),
                nextFolio: Number(fiscalProfile.nextFolio ?? 1),
                fiscalEnvironment: String(fiscalProfile.fiscalEnvironment ?? "TEST"),
                pacProvider: String(fiscalProfile.pacProvider ?? ""),
            },
            completeness: {
                isReadyForInvoicing: Boolean(rfc && legalName && taxRegime && fiscalZipCode),
                missingFields: [
                    !rfc ? "rfc" : "",
                    !legalName ? "legalName" : "",
                    !taxRegime ? "taxRegime" : "",
                    !fiscalZipCode ? "fiscalZipCode" : "",
                ].filter(Boolean),
            },
        };
    }

    async getFiscalProfile(companyId: string, currentUser: CurrentUser) {
        const company = await this.ensureCompanyAccess(companyId, currentUser, false);
        return this.mapFiscalProfile(company);
    }

    async updateFiscalProfile(
        companyId: string,
        currentUser: CurrentUser,
        updateCompanyFiscalProfileDto: UpdateCompanyFiscalProfileDto
    ) {
        await this.ensureCompanyAccess(companyId, currentUser, true);

        const company = await CompanyModel.findByIdAndUpdate(
            companyId,
            {
                $set: {
                    fiscalProfile: {
                        rfc: updateCompanyFiscalProfileDto.rfc,
                        legalName: updateCompanyFiscalProfileDto.legalName,
                        taxRegime: updateCompanyFiscalProfileDto.taxRegime,
                        fiscalZipCode: updateCompanyFiscalProfileDto.fiscalZipCode,
                        fiscalEmail: updateCompanyFiscalProfileDto.fiscalEmail,
                        defaultSeries: updateCompanyFiscalProfileDto.defaultSeries,
                        nextFolio: updateCompanyFiscalProfileDto.nextFolio,
                        fiscalEnvironment: updateCompanyFiscalProfileDto.fiscalEnvironment,
                        pacProvider: updateCompanyFiscalProfileDto.pacProvider,
                    },
                },
            },
            { new: true, lean: true }
        );

        if (!company) {
            throw CustomError.notFound("Company not found");
        }

        return this.mapFiscalProfile(company);
    }

}
