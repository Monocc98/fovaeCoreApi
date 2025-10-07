

import { Validators } from "../../config";
import { CategoryModel, CompanyModel } from "../../data";
import { SubcategoryModel } from "../../data/mongo/models/subcategory.model";
import { SubsubcategoryModel } from "../../data/mongo/models/subsubcategory.model";
import { CreateCategoryDto, CustomError, UpdateCategoryDto } from "../../domain";
import { CreateSubcategoryDto, UpdateSubcategoryDto } from "../../domain/dtos/category/subcategory.dto";
import { CreateSubsubcategoryDto, UpdateSubsubcategoryDto } from "../../domain/dtos/category/subsubcategory.dto";

export class CategoryService {
    
    // DI
    constructor () {}

    async createCategory( createCategoryDto: CreateCategoryDto ) {

        //TODO ? una manera de evitar que se confundan categorias
        const categoryExists = await CategoryModel.findOne({ name: createCategoryDto.name });
        if ( categoryExists ) throw CustomError.badRequest( 'Category already exists' );

        try {

            const category = new CategoryModel({
                ...createCategoryDto,
            });

            await category.save();

            return {
                category
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async createSubcategory( createSubcategoryDto: CreateSubcategoryDto ) {

        //TODO ? una manera de evitar que se confundan categorias
        const subcategoryExists = await SubcategoryModel.findOne({ name: createSubcategoryDto.name });
        if ( subcategoryExists ) throw CustomError.badRequest( 'Category already exists' );

        try {

            const subcategory = new SubcategoryModel({
                ...createSubcategoryDto,
            });

            await subcategory.save();

            return {
                subcategory
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async createSubsubcategory( createSubsubcategoryDto: CreateSubsubcategoryDto ) {

        //TODO ? una manera de evitar que se confundan categorias
        const subsubcategoryExists = await SubsubcategoryModel.findOne({ name: createSubsubcategoryDto.name });
        if ( subsubcategoryExists ) throw CustomError.badRequest( 'Category already exists' );

        try {

            const subsubcategory = new SubsubcategoryModel({
                ...createSubsubcategoryDto,
            });

            await subsubcategory.save();

            return {
                subsubcategory
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getCategories() {

        try {

            const categories = await CategoryModel.find()
                // .populate('group')
            

            return {
                categories: categories
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getCategoriesOverview(companyId: string) {
        try {
      if (!Validators.isMongoID(companyId)) {
        throw CustomError.badRequest("Invalid company ID");
      }
      const _id = Validators.convertToUid(companyId);

      const [company] = await CompanyModel.aggregate([
        { $match: { _id } },

        // Categories de la compañía
        {
          $lookup: {
            from: "categories",                // nombre de la COLECCIÓN
            let: { companyId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$company", "$$companyId"] } } },
              { $sort: { name: 1 } },

              // Subcategories por categoría
              {
                $lookup: {
                  from: "subcategories",       // nombre de la COLECCIÓN
                  let: { categoryId: "$_id" },
                  pipeline: [
                    { $match: { $expr: { $eq: ["$parent", "$$categoryId"] } } },
                    { $sort: { name: 1 } },

                    // Subsubcategories por subcategory
                    {
                      $lookup: {
                        from: "subsubcategories", // nombre de la COLECCIÓN
                        let: { subcategoryId: "$_id" },
                        pipeline: [
                          { $match: { $expr: { $eq: ["$parent", "$$subcategoryId"] } } },
                          { $sort: { name: 1 } },
                          { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1, type: 1 } },
                        ],
                        as: "subsubcategories",
                      },
                    },

                    { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1, type: 1, subsubcategories: 1 } },
                  ],
                  as: "subcategories",
                },
              },

              { $project: { _id: 1, name: 1, company: 1, scope: 1, type: 1, subcategories: 1 } },
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

      // Estructura final:
      // { company: { _id, name, group, rfc, categories: [{..., subcategories: [{..., subsubcategories: [...] }]}] } }
      return { company };
      // const company = Validators.convertToUid(companyId);

      // const categories = await CategoryModel.aggregate([
      //   // 1) Filtra las categorías de la empresa (y lo que necesites: type, scope, etc.)
      //   { $match: { company, /* scope: "COMPANY", */ /* type: "INCOME" */ } },

      //   // 2) Subcategorías de cada categoría
      // { $unwind: "$company" },
      //   {
      //     $lookup: {
      //       from: "subcategories", // 👈 nombre de la COLECCIÓN
      //       let: { categoryId: "$_id" },
      //       pipeline: [
      //         { $match: { $expr: { $eq: ["$parent", "$$categoryId"] } } },
      //         { $sort: { name: 1 } },

      //         // 3) Subsubcategorías de cada subcategoría
      //         {
      //           $lookup: {
      //             from: "subsubcategories", // 👈 nombre de la COLECCIÓN
      //             let: { subcategoryId: "$_id" },
      //             pipeline: [
      //               { $match: { $expr: { $eq: ["$parent", "$$subcategoryId"] } } },
      //               { $sort: { name: 1 } },
      //               { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1 } },
      //             ],
      //             as: "subsubcategories",
      //           },
      //         },

      //         { $project: { _id: 1, name: 1, parent: 1, company: 1, scope: 1, subsubcategories: 1 } },
      //       ],
      //       as: "subcategories",
      //     },
      //   },

      //   { $sort: { name: 1 } },
      //   { $project: { _id: 1, name: 1, company: 1, scope: 1, type: 1, subcategories: 1 } },
      // ])
      // // si esperas volúmenes grandes:
      // .allowDiskUse?.(true);

      // return categories;
    } catch (error) {
      console.error("[getCategoriesTree] error:", error);
      throw CustomError.internalServer("Internal Server Error");
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
          throw CustomError.internalServer(`${ error }`);
      }

  } 

}