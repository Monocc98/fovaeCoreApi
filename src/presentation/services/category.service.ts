import mongoose from "mongoose";
import { Validators } from "../../config";
import { CategoryModel, CompanyModel } from "../../data";
import { SubcategoryModel } from "../../data/mongo/models/subcategory.model";
import { SubsubcategoryModel } from "../../data/mongo/models/subsubcategory.model";
import {
    CATEGORY_BUCKETS,
    CATEGORY_TYPES,
    CreateCategoryDto,
    CustomError,
    EXPENSE_CATEGORY_BUCKETS,
    ReorderCategoriesDto,
    UpdateCategoryDto,
} from "../../domain";
import { CreateSubcategoryDto, UpdateSubcategoryDto } from "../../domain/dtos/category/subcategory.dto";
import { CreateSubsubcategoryDto, UpdateSubsubcategoryDto } from "../../domain/dtos/category/subsubcategory.dto";

export class CategoryService {
    
    // DI
    constructor () {}

    private readonly reorderLevels = ['category', 'subcategory', 'subsubcategory'] as const;

    private isTransactionNotSupportedError(error: unknown) {
        const message = `${ error }`.toLowerCase();
        return (
            message.includes('transaction numbers are only allowed on a replica set member or mongos') ||
            message.includes('replica set') ||
            message.includes('transactions are not supported')
        );
    }

    private compareObjectIds(a: unknown, b: unknown) {
        const aStr = `${ a }`;
        const bStr = `${ b }`;
        return aStr.localeCompare(bStr);
    }

    private hasValidSortIndex(value: unknown): value is number {
        return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    }

    private async normalizeSiblingOrder(model: any, filter: Record<string, any>): Promise<any[]> {
        const docs: any[] = await model.find(filter)
            .select('_id sortIndex')
            .sort({ _id: 1 })
            .lean();

        const normalizedDocs = [...docs].sort((a: Record<string, any>, b: Record<string, any>) => {
            const aHasSortIndex = this.hasValidSortIndex(a.sortIndex);
            const bHasSortIndex = this.hasValidSortIndex(b.sortIndex);

            if (aHasSortIndex && bHasSortIndex) {
                return a.sortIndex - b.sortIndex || this.compareObjectIds(a._id, b._id);
            }

            if (aHasSortIndex) return -1;
            if (bHasSortIndex) return 1;

            return this.compareObjectIds(a._id, b._id);
        });

        const operations = normalizedDocs
            .map((doc: Record<string, any>, index: number) => ({ doc, index }))
            .filter(({ doc, index }) => doc.sortIndex !== index)
            .map(({ doc, index }) => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { sortIndex: index } },
                },
            }));

        if (operations.length > 0) {
            await model.bulkWrite(operations);
        }

        return normalizedDocs.map((doc: Record<string, any>, index: number) => ({
            ...doc,
            sortIndex: index,
        }));
    }

    private async ensureCompanyTreeSortIndexes(companyId: string) {
        const companyIdMongo = Validators.convertToUid(companyId);
        const categories = await this.normalizeSiblingOrder(CategoryModel, { company: companyIdMongo });

        for (const category of categories) {
            const subcategories = await this.normalizeSiblingOrder(SubcategoryModel, { parent: category._id });

            for (const subcategory of subcategories) {
                await this.normalizeSiblingOrder(SubsubcategoryModel, { parent: subcategory._id });
            }
        }
    }

    private getReorderConfig(level: ReorderCategoriesDto['level']): { model: any; filter: (parentId: string) => Record<string, any> } {
        if (!this.reorderLevels.includes(level)) {
            throw CustomError.badRequest('Invalid reorder level');
        }

        switch (level) {
            case 'category':
                return {
                    model: CategoryModel,
                    filter: (parentId: string) => ({ company: Validators.convertToUid(parentId) }),
                };
            case 'subcategory':
                return {
                    model: SubcategoryModel,
                    filter: (parentId: string) => ({ parent: Validators.convertToUid(parentId) }),
                };
            case 'subsubcategory':
                return {
                    model: SubsubcategoryModel,
                    filter: (parentId: string) => ({ parent: Validators.convertToUid(parentId) }),
                };
        }
    }

    async createCategory( createCategoryDto: CreateCategoryDto ) {

        try {

            const categoryExists = await CategoryModel.findOne({
                name: createCategoryDto.name,
                company: createCategoryDto.company,
            });

            if (categoryExists) {
                throw CustomError.badRequest('Category already exists for this company');
            }

            const siblings = await this.normalizeSiblingOrder(CategoryModel, {
                company: Validators.convertToUid(createCategoryDto.company),
            });

            const category = new CategoryModel({
                ...createCategoryDto,
                sortIndex: siblings.length,
            });

            await category.save();

            return {
                category
            };
             
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async createSubcategory( createSubcategoryDto: CreateSubcategoryDto ) {

        try {

            const subcategoryExists = await SubcategoryModel.findOne({
                name: createSubcategoryDto.name,
                company: createSubcategoryDto.company,
                parent: createSubcategoryDto.parent,
            });

            if (subcategoryExists) {
                throw CustomError.badRequest('Subcategory already exists in this category');
            }

            const siblings = await this.normalizeSiblingOrder(SubcategoryModel, {
                parent: Validators.convertToUid(createSubcategoryDto.parent),
            });

            const subcategory = new SubcategoryModel({
                ...createSubcategoryDto,
                sortIndex: siblings.length,
            });

            await subcategory.save();

            return {
                subcategory
            };
             
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async createSubsubcategory( createSubsubcategoryDto: CreateSubsubcategoryDto ) {

        try {
            const subsubcategoryExists = await SubsubcategoryModel.findOne({
                name: createSubsubcategoryDto.name,
                company: createSubsubcategoryDto.company,
                parent: createSubsubcategoryDto.parent,
            });

            if (subsubcategoryExists) {
                throw CustomError.badRequest('Subsubcategory already exists in this subcategory');
            }

            const siblings = await this.normalizeSiblingOrder(SubsubcategoryModel, {
                parent: Validators.convertToUid(createSubsubcategoryDto.parent),
            });

            const subsubcategory = new SubsubcategoryModel({
                ...createSubsubcategoryDto,
                sortIndex: siblings.length,
            });

            await subsubcategory.save();

            return {
                subsubcategory
            };
             
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getCategories() {

        try {

            const categories = await CategoryModel.find()
                .sort({ company: 1, sortIndex: 1, name: 1 })
                // .populate('group')
             

            return {
                categories: categories
            };
            
        } catch (error) {
            if (error instanceof CustomError) throw error;
            console.log(error);
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getCategoryBucketOptions() {
        return {
            categoryTypes: [...CATEGORY_TYPES],
            categoryBuckets: {
                INCOME: ['INCOME', 'UTILITY'],
                EXPENSE: [...EXPENSE_CATEGORY_BUCKETS],
            },
            bucketOptions: [
                { value: 'INCOME', label: 'Income', categoryType: 'INCOME' },
                { value: 'UTILITY', label: 'Utility', categoryType: 'INCOME' },
                { value: 'FIXED_EXPENSE', label: 'Fixed Expense', categoryType: 'EXPENSE' },
                { value: 'VARIABLE_EXPENSE', label: 'Variable Expense', categoryType: 'EXPENSE' },
                { value: 'FAMILY', label: 'Family', categoryType: 'EXPENSE' },
            ],
            deprecatedBuckets: ['OTHER'],
            allowedBuckets: [...CATEGORY_BUCKETS],
        };
    }

    async getCategoriesOverview(companyId: string) {
        try {
      if (!Validators.isMongoID(companyId)) {
        throw CustomError.badRequest("Invalid company ID");
      }
      const _id = Validators.convertToUid(companyId);

      await this.ensureCompanyTreeSortIndexes(companyId);

      const [company] = await CompanyModel.aggregate([
        { $match: { _id } },

        // Categories de la compañía
        {
          $lookup: {
            from: "categories",                // nombre de la COLECCIÓN
            let: { companyId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },
              { $sort: { sortIndex: 1, name: 1 } },

              // Subcategories por categoría
              {
                $lookup: {
                  from: "subcategories",       // nombre de la COLECCIÓN
                  let: { categoryId: "$_id" },
                  pipeline: [
                    { $match: { $expr: { $eq: ["$parent", "$$categoryId"] } } },
                    { $sort: { sortIndex: 1, name: 1 } },

                    // Subsubcategories por subcategory
                    {
                      $lookup: {
                        from: "subsubcategories", // nombre de la COLECCIÓN
                        let: { subcategoryId: "$_id" },
                        pipeline: [
                          { $match: { $expr: { $eq: ["$parent", "$$subcategoryId"] } } },
                          { $sort: { sortIndex: 1, name: 1 } },
                          { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1, type: 1, sortIndex: 1 } },
                        ],
                        as: "subsubcategories",
                      },
                    },

                    { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1, type: 1, subsubcategories: 1, sortIndex: 1 } },
                  ],
                  as: "subcategories",
                },
              },

              { $project: { _id: 1, name: 1, company: 1, scope: 1, type: 1, bucket: 1, subcategories: 1, sortIndex: 1 } },
            ],
            as: "categories",
          },
        },

        // Campos finales de la company (ajusta a tu schema real)
        {
          $project: {
            _id: 1,
            name: 1,
            group: 1,   // si existe
            rfc: 1,     // si existe
            categories: 1,
          },
        },
      ]);

      if (!company) throw CustomError.notFound("Company not found");

      return { company };
      
    } catch (error) {
      if (error instanceof CustomError) throw error;
      console.error("[getCategoriesTree] error:", error);
      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async reorderCategories(reorderCategoriesDto: ReorderCategoriesDto) {

      const config = this.getReorderConfig(reorderCategoriesDto.level);
      const filter = config.filter(reorderCategoriesDto.parentId);

      await this.normalizeSiblingOrder(config.model, filter);

      const siblings: any[] = await config.model.find(filter)
          .select('_id')
          .sort({ sortIndex: 1, _id: 1 })
          .lean();

      if (siblings.length === 0) {
          throw CustomError.badRequest('No items found for the provided reorder group');
      }

      if (siblings.length !== reorderCategoriesDto.orderedIds.length) {
          throw CustomError.badRequest('orderedIds must include every sibling exactly once');
      }

      const currentIds = siblings.map((doc: Record<string, any>) => `${ doc._id }`).sort();
      const requestedIds = [...reorderCategoriesDto.orderedIds].sort();

      if (currentIds.some((id: string, index: number) => id !== requestedIds[index])) {
          throw CustomError.badRequest('orderedIds must match the exact sibling set for the provided parent');
      }

      const operations = reorderCategoriesDto.orderedIds.map((id: string, index: number) => ({
          updateOne: {
              filter: { _id: Validators.convertToUid(id) },
              update: { $set: { sortIndex: index } },
          },
      }));

      const session = await mongoose.startSession();

      try {
          let transactionFallback = false;

          try {
              await session.withTransaction(async () => {
                  await config.model.bulkWrite(operations, { session });
              });
          } catch (error) {
              if (!this.isTransactionNotSupportedError(error)) {
                  throw error;
              }

              await config.model.bulkWrite(operations);
              transactionFallback = true;
          }

          const items: any[] = await config.model.find(filter)
              .sort({ sortIndex: 1, name: 1 })
              .lean();

          return {
              level: reorderCategoriesDto.level,
              parentId: reorderCategoriesDto.parentId,
              items,
              ...(transactionFallback ? { transactionFallback: true } : {}),
          };
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      } finally {
          await session.endSession();
      }
  }


  async updateCategory( idCategory: string, updateCategoryDto: UpdateCategoryDto ) {

      try {

          if(!Validators.isMongoID(idCategory)) throw CustomError.badRequest('Invalid category ID');
          const categoryIdMongo = Validators.convertToUid(idCategory);

          const prevCategory = await CategoryModel.findById(categoryIdMongo);
          if (!prevCategory) throw CustomError.notFound('Category not found');

          const updatedCategory = await CategoryModel.findByIdAndUpdate(
              categoryIdMongo,
              { ...updateCategoryDto},
              { new: true }
          );

          return {updatedCategory}
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

  async updateSubcategory( idSubcategory: string, updateSubcategoryDto: UpdateSubcategoryDto ) {

      try {

          if(!Validators.isMongoID(idSubcategory)) throw CustomError.badRequest('Invalid subcategory ID');
          const subcategoryIdMongo = Validators.convertToUid(idSubcategory);

          const prevSubcategory = await SubcategoryModel.findById(subcategoryIdMongo);
          if (!prevSubcategory) throw CustomError.notFound('Subcategory not found');

          const updatedSubcategory = await SubcategoryModel.findByIdAndUpdate(
              subcategoryIdMongo,
              { ...updateSubcategoryDto},
              { new: true }
          );

          return {updatedSubcategory}
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

  async updateSubsubcategory( idsubsubcategory: string, updateSubsubcategoryDto: UpdateSubsubcategoryDto ) {

      try {

          if(!Validators.isMongoID(idsubsubcategory)) throw CustomError.badRequest('Invalid Subsubcategory ID');
          const subsubcategoryIdMongo = Validators.convertToUid(idsubsubcategory);

          const prevSubsubcategory = await SubsubcategoryModel.findById(subsubcategoryIdMongo);
          if (!prevSubsubcategory) throw CustomError.notFound('Subsubcategory not found');

          const updatedSubsubcategory = await SubsubcategoryModel.findByIdAndUpdate(
              subsubcategoryIdMongo,
              { ...updateSubsubcategoryDto},
              { new: true }
          );

          return {updatedSubsubcategory}
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

  async deleteCategory( idCategory: string ) {
  
      try {

          if(!Validators.isMongoID(idCategory)) throw CustomError.badRequest('Invalid category ID');
          const categoryIdMongo = Validators.convertToUid(idCategory);

          const deletedCategory = await CategoryModel.findByIdAndDelete(categoryIdMongo);

          return {deletedCategory};
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

  async deleteSubcategory( idSubcategory: string ) {
  
      try {

          if(!Validators.isMongoID(idSubcategory)) throw CustomError.badRequest('Invalid subcategory ID');
          const subcategoryIdMongo = Validators.convertToUid(idSubcategory);

          const deletedSubcategory = await SubcategoryModel.findByIdAndDelete(subcategoryIdMongo);

          return {deletedSubcategory};
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

  async deleteSubsubcategory( idSubsubcategory: string ) {
  
      try {

          if(!Validators.isMongoID(idSubsubcategory)) throw CustomError.badRequest('Invalid subsubcategory ID');
          const subsubcategoryIdMongo = Validators.convertToUid(idSubsubcategory);

          const deletedSubsubcategory = await SubsubcategoryModel.findByIdAndDelete(subsubcategoryIdMongo);

          return {deletedSubsubcategory};
          
      } catch (error) {
          if (error instanceof CustomError) throw error;
          throw CustomError.internalServer(`${ error }`);
      }

  } 

}
