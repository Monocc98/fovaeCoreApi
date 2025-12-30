import { Validators } from "../../config";
import { FiscalYear_CompanyModel } from "../../data/mongo/models/fiscalYear_Company.model";
import { CustomError } from "../../domain";
import { CreateFiscalYear_CompanyDto } from "../../domain/dtos/fiscalYear/membership.dto";

export class FiscalYear_CompanyService {
  // DI
  constructor() {}

  async createFiscalYear_Company(
    createFiscalYear_CompanyDto: CreateFiscalYear_CompanyDto
  ) {
    const fiscalYear_CompanyExists = await FiscalYear_CompanyModel.findOne({
      fiscalYear: createFiscalYear_CompanyDto.fiscalYear,
      company: createFiscalYear_CompanyDto.company,
    });
    if (fiscalYear_CompanyExists)
      throw CustomError.badRequest("FiscalYear_Company already exists");

    try {
      const fiscalYear_Company = new FiscalYear_CompanyModel({
        ...createFiscalYear_CompanyDto,
      });

      await fiscalYear_Company.save();

      return {
        fiscalYear_Company,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async getFiscalYears_Companies() {
    try {
      const fiscalYear_Companys = await FiscalYear_CompanyModel.find()
        .populate("company")
        .populate("fiscalYear");

      return {
        fiscalYear_Companys,
      };
    } catch (error) {
      console.log(error);

      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async getFiscalYears_CompaniesByCompanyId(idCompany: string) {
    try {
      if (!Validators.isMongoID(idCompany))
        throw CustomError.badRequest("Invalid company ID");
      const accountIdMongo = Validators.convertToUid(idCompany);

      const fiscalYears_Companies = await FiscalYear_CompanyModel.find({
        company: accountIdMongo,
      })
        .populate("company")
        .populate("fiscalYear");

      return {
        fiscalYears_Companies,
      };
    } catch (error) {
      console.log(error);

      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async lockBudget(idFiscalYearCompanie: string) {
    try {
      if (!Validators.isMongoID(idFiscalYearCompanie))
        throw CustomError.badRequest("Invalid FiscalYear_Company ID");

      const linkId = Validators.convertToUid(idFiscalYearCompanie);

      // (Opcional) asegura que existe
      const exists = await FiscalYear_CompanyModel.findById(linkId);
      if (!exists) throw CustomError.notFound("FiscalYear_Company not found");

      // ✅ Toggle atómico (invierte el boolean)
      const updated = await FiscalYear_CompanyModel.findByIdAndUpdate(
        linkId,
        [
          {
            $set: {
              budgetLocked: { $not: ["$budgetLocked"] },
              budgetLockedAt: "$$NOW", // opcional
            },
          },
        ],
        { new: true }
      )
        .populate("company")
        .populate("fiscalYear");

      return { fiscalYear_Company: updated };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }
}
