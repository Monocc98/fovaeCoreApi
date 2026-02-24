import { Validators } from "../../config";
import { AccountModel, CategoryModel, MembershipModel, MovementModel } from "../../data";
import { BudgetModel } from "../../data/mongo/models/budget.model";
import { FiscalYear_CompanyModel } from "../../data/mongo/models/fiscalYear_Company.model";
import { CustomError } from "../../domain";

export class GraphicsService {
  constructor() {}

  async getExpenseBudgetTreeByMonth(userId: string, idCompany: string) {
    if (!Validators.isMongoID(idCompany)) {
      throw CustomError.badRequest("Invalid company ID");
    }

    const uid = Validators.convertToUid(userId);
    const companyId = Validators.convertToUid(idCompany);

    try {
      const [membershipCompany] = await MembershipModel.aggregate([
        {
          $match: {
            user: uid,
            company: companyId,
          },
        },
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "companyDoc",
          },
        },
        { $unwind: "$companyDoc" },
        {
          $project: {
            _id: "$companyDoc._id",
            name: "$companyDoc.name",
          },
        },
      ]);

      if (!membershipCompany) {
        throw CustomError.forbidden("You do not have access to this company");
      }

      return await this.buildExpenseTreeForCompany(membershipCompany);
    } catch (error) {
      console.log(error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw CustomError.internalServer("Internal Server Error");
    }
  }

  private async buildExpenseTreeForCompany(company: Record<string, any>) {
    const companyId = company._id;

    const [fyLink] = await FiscalYear_CompanyModel.aggregate([
      { $match: { company: companyId } },
      {
        $lookup: {
          from: "fiscalyears",
          localField: "fiscalYear",
          foreignField: "_id",
          as: "fy",
        },
      },
      { $addFields: { fy: { $arrayElemAt: ["$fy", 0] } } },
      {
        $addFields: {
          fyEnd: {
            $ifNull: [
              "$fy.endDate",
              {
                $dateAdd: {
                  startDate: "$fy.startDate",
                  unit: "month",
                  amount: 12,
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $lte: ["$fy.startDate", "$$NOW"] },
              { $gt: ["$fyEnd", "$$NOW"] },
            ],
          },
        },
      },
      { $sort: { "fy.startDate": -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          fiscalYear: "$fy",
          fyEnd: 1,
        },
      },
    ]);

    if (!fyLink?.fiscalYear?.startDate) {
      return {
        ...company,
        fiscalYear: null,
        months: [],
        summaryByMonth: [],
        categories: [],
      };
    }

    const fyStart = new Date(fyLink.fiscalYear.startDate);
    const fyEnd = new Date(fyLink.fyEnd);
    const fiscalMonths = this.buildFiscalMonths(fyStart, fyEnd);
    if (fiscalMonths.length === 0) {
      return {
        ...company,
        fiscalYear: {
          _id: fyLink.fiscalYear._id,
          name: fyLink.fiscalYear.name,
          startDate: fyLink.fiscalYear.startDate,
          endDate: fyLink.fiscalYear.endDate ?? fyLink.fyEnd,
        },
        months: [],
        summaryByMonth: [],
        categories: [],
      };
    }

    const accountDocs = await AccountModel.find({ company: companyId }, { _id: 1 }).lean();
    const accountIds = accountDocs.map((a: Record<string, any>) => a._id);

    const expenseTree = await CategoryModel.aggregate([
      { $match: { company: companyId, type: "EXPENSE" } },
      { $sort: { sortIndex: 1, name: 1 } },
      {
        $lookup: {
          from: "subcategories",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$parent", "$$categoryId"] },
              },
            },
            { $sort: { sortIndex: 1, name: 1 } },
            {
              $lookup: {
                from: "subsubcategories",
                let: { subcategoryId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$parent", "$$subcategoryId"] },
                    },
                  },
                  { $sort: { sortIndex: 1, name: 1 } },
                  { $project: { _id: 1, name: 1, sortIndex: 1 } },
                ],
                as: "subsubcategories",
              },
            },
            { $project: { _id: 1, name: 1, sortIndex: 1, subsubcategories: 1 } },
          ],
          as: "subcategories",
        },
      },
      { $project: { _id: 1, name: 1, sortIndex: 1, subcategories: 1 } },
    ]);

    const validMonthOr = fiscalMonths.map((m) => ({ year: m.year, month: m.month }));

    const budgetRows =
      validMonthOr.length === 0
        ? []
        : await BudgetModel.aggregate([
            {
              $match: {
                company: companyId,
                $or: validMonthOr,
              },
            },
            {
              $lookup: {
                from: "subsubcategories",
                localField: "subsubcategory",
                foreignField: "_id",
                as: "subsub",
              },
            },
            { $addFields: { subsub: { $arrayElemAt: ["$subsub", 0] } } },
            {
              $lookup: {
                from: "subcategories",
                localField: "subsub.parent",
                foreignField: "_id",
                as: "subcat",
              },
            },
            { $addFields: { subcat: { $arrayElemAt: ["$subcat", 0] } } },
            {
              $lookup: {
                from: "categories",
                localField: "subcat.parent",
                foreignField: "_id",
                as: "cat",
              },
            },
            { $addFields: { cat: { $arrayElemAt: ["$cat", 0] } } },
            {
              $match: {
                "cat.type": "EXPENSE",
              },
            },
            {
              $group: {
                _id: {
                  subsubcategory: "$subsubcategory",
                  year: "$year",
                  month: "$month",
                },
                budget: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 0,
                subsubcategory: "$_id.subsubcategory",
                year: "$_id.year",
                month: "$_id.month",
                budget: { $toDouble: { $ifNull: ["$budget", 0] } },
              },
            },
          ]);

    const movementRows = await MovementModel.aggregate([
      {
        $match: {
          account: { $in: accountIds },
          source: { $ne: "TRANSFER" },
          occurredAt: { $gte: fyStart, $lt: fyEnd },
          amount: { $lt: 0 },
        },
      },
      {
        $lookup: {
          from: "subsubcategories",
          localField: "subsubcategory",
          foreignField: "_id",
          as: "subsub",
        },
      },
      { $addFields: { subsub: { $arrayElemAt: ["$subsub", 0] } } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subsub.parent",
          foreignField: "_id",
          as: "subcat",
        },
      },
      { $addFields: { subcat: { $arrayElemAt: ["$subcat", 0] } } },
      {
        $lookup: {
          from: "categories",
          localField: "subcat.parent",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $addFields: { cat: { $arrayElemAt: ["$cat", 0] } } },
      {
        $match: {
          "cat.type": "EXPENSE",
        },
      },
      {
        $group: {
          _id: {
            subsubcategory: "$subsubcategory",
            year: { $year: "$occurredAt" },
            month: { $month: "$occurredAt" },
          },
          spent: { $sum: { $abs: "$amount" } },
        },
      },
      {
        $project: {
          _id: 0,
          subsubcategory: "$_id.subsubcategory",
          year: "$_id.year",
          month: "$_id.month",
          spent: { $toDouble: { $ifNull: ["$spent", 0] } },
        },
      },
    ]);

    const budgetMap = new Map<string, number>();
    for (const row of budgetRows) {
      budgetMap.set(this.subsubMonthKey(row.subsubcategory, row.year, row.month), Number(row.budget) || 0);
    }

    const spentMap = new Map<string, number>();
    for (const row of movementRows) {
      spentMap.set(this.subsubMonthKey(row.subsubcategory, row.year, row.month), Number(row.spent) || 0);
    }

    const categories = expenseTree.map((category: Record<string, any>) =>
      this.buildCategoryNode(category, fiscalMonths, budgetMap, spentMap)
    );

    const summaryByMonth = fiscalMonths.map((month, index) => {
      let budget = 0;
      let spent = 0;

      for (const category of categories) {
        budget += Number(category.byMonth[index]?.budget ?? 0);
        spent += Number(category.byMonth[index]?.spent ?? 0);
      }

      return {
        ...month,
        budget,
        spent,
        remaining: budget - spent,
      };
    });

    return {
      ...company,
      fiscalYear: {
        _id: fyLink.fiscalYear._id,
        name: fyLink.fiscalYear.name,
        startDate: fyLink.fiscalYear.startDate,
        endDate: fyLink.fiscalYear.endDate ?? fyLink.fyEnd,
      },
      months: fiscalMonths,
      summaryByMonth,
      categories,
    };
  }

  private buildFiscalMonths(startDate: Date, endDate: Date) {
    const months: Array<{ fiscalPos: number; year: number; month: number }> = [];
    let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const limit = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

    while (cursor < limit) {
      months.push({
        fiscalPos: months.length + 1,
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return months;
  }

  private buildCategoryNode(
    category: Record<string, any>,
    fiscalMonths: Array<{ fiscalPos: number; year: number; month: number }>,
    budgetMap: Map<string, number>,
    spentMap: Map<string, number>
  ) {
    const subcategories = (category.subcategories ?? []).map((subcategory: Record<string, any>) =>
      this.buildSubcategoryNode(subcategory, fiscalMonths, budgetMap, spentMap)
    );

    const byMonth = fiscalMonths.map((month, index) => {
      let budget = 0;
      let spent = 0;

      for (const subcategory of subcategories) {
        budget += Number(subcategory.byMonth[index]?.budget ?? 0);
        spent += Number(subcategory.byMonth[index]?.spent ?? 0);
      }

      return {
        ...month,
        budget,
        spent,
        remaining: budget - spent,
      };
    });

    return {
      _id: category._id,
      name: category.name,
      byMonth,
      subcategories,
    };
  }

  private buildSubcategoryNode(
    subcategory: Record<string, any>,
    fiscalMonths: Array<{ fiscalPos: number; year: number; month: number }>,
    budgetMap: Map<string, number>,
    spentMap: Map<string, number>
  ) {
    const subsubcategories = (subcategory.subsubcategories ?? []).map((subsubcategory: Record<string, any>) => {
      const byMonth = fiscalMonths.map((month) => {
        const key = this.subsubMonthKey(subsubcategory._id, month.year, month.month);
        const budget = Number(budgetMap.get(key) ?? 0);
        const spent = Number(spentMap.get(key) ?? 0);

        return {
          ...month,
          budget,
          spent,
          remaining: budget - spent,
        };
      });

      return {
        _id: subsubcategory._id,
        name: subsubcategory.name,
        byMonth,
      };
    });

    const byMonth = fiscalMonths.map((month, index) => {
      let budget = 0;
      let spent = 0;

      for (const subsubcategory of subsubcategories) {
        budget += Number(subsubcategory.byMonth[index]?.budget ?? 0);
        spent += Number(subsubcategory.byMonth[index]?.spent ?? 0);
      }

      return {
        ...month,
        budget,
        spent,
        remaining: budget - spent,
      };
    });

    return {
      _id: subcategory._id,
      name: subcategory.name,
      byMonth,
      subsubcategories,
    };
  }

  private subsubMonthKey(subsubcategoryId: any, year: number, month: number) {
    return `${String(subsubcategoryId)}|${year}|${month}`;
  }
}
