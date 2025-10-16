import { Validators } from "../../config";
import { AccountBalancesModel } from "../../data";
import { BudgetModel } from "../../data/mongo/models/budget.model";
import { CustomError } from "../../domain";
import { CreateBudgetDto, UpdateBudgetDto } from "../../domain/dtos/budget/budget.dto";



export class BudgetService {
    
    // DI
    constructor () {}

    async createBudget( createBudgetDto: CreateBudgetDto ) {

        try {

            const budget = new BudgetModel({
                ...createBudgetDto
            });

            await budget.save();
            
            return {
                budget
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async updateBudget( idBudget: string, updateBudgetDto: UpdateBudgetDto ) {

        try {

            if(!Validators.isMongoID(idBudget)) throw CustomError.badRequest('Invalid budget ID');
            const budgetIdMongo = Validators.convertToUid(idBudget);

            const prevBudget = await BudgetModel.findById(budgetIdMongo);
            if (!prevBudget) throw CustomError.notFound('Budget not found');

            const updatedBudget = await BudgetModel.findByIdAndUpdate(
                budgetIdMongo,
                { ...updateBudgetDto},
                { new: true }
            );

            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async deleteBudget( idBudget: string ) {

        try {

            if(!Validators.isMongoID(idBudget)) throw CustomError.badRequest('Invalid budget ID');
            const budgetIdMongo = Validators.convertToUid(idBudget);

            const prevBudget = await BudgetModel.findById(budgetIdMongo);
            if (!prevBudget) throw CustomError.notFound('Budget not found');

            const deletedBudget = await BudgetModel.findByIdAndDelete(budgetIdMongo);

            return {deletedBudget};
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getBudgets() {

        try {

            const budgets = await BudgetModel.find()
                .populate('subsubcategory')
            

            return {
                budgets: budgets
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getBudgetsByAccountId( idAccount: string ) {

        try {

            if(!Validators.isMongoID(idAccount)) throw CustomError.badRequest('Invalid account ID');
            const accountIdMongo = Validators.convertToUid(idAccount);

            const budgets = await BudgetModel.find({ account: accountIdMongo })
                .populate('subsubcategory')

            return {
                budgets,
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getBudgetsById( idBudget: string ) {

        try {

            if(!Validators.isMongoID(idBudget)) throw CustomError.badRequest('Invalid account ID');
            const accountIdMongo = Validators.convertToUid(idBudget);

            const budget = await BudgetModel.findById(idBudget)
                .populate({
                    path: 'subsubcategory',
                    select: 'name scope parent company',
                    populate: {
                        path: 'parent',                       // subcategory (ref: 'Subcategory')
                        select: 'name scope parent company type',
                        populate: {
                            path: 'parent',                     // category (ref: 'Category')
                            select: 'name scope company type',
                        }
                    }

                })

            return {budget};
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}