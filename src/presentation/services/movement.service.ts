import { Validators } from "../../config";
import { AccountBalancesModel, MovementModel } from "../../data";
import { CreateMovementDto, CustomError, UpdateMovementDto } from "../../domain";



export class MovementService {
    
    // DI
    constructor () {}

    async createMovement( createMovementDto: CreateMovementDto ) {

        try {

            const movement = new MovementModel({
                ...createMovementDto,
                recordedAt: new Date(),
            });

            await movement.save();

            await AccountBalancesModel.updateOne(
                { _id: movement.account },
                { $inc: { balance: movement.amount } }
            )

            return {
                movement
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async updateMovement( idMovement: string, updateMovementDto: UpdateMovementDto ) {

        try {

            if(!Validators.isMongoID(idMovement)) throw CustomError.badRequest('Invalid movement ID');
            const movementIdMongo = Validators.convertToUid(idMovement);

            const prevMovement = await MovementModel.findById(movementIdMongo);
            if (!prevMovement) throw CustomError.notFound('Movement not found');

            const prevAmount   = Number(prevMovement.amount);

            const newAmount = updateMovementDto.amount !== undefined
                ? Number(updateMovementDto.amount)
                : prevAmount;


            const updatedMovement = await MovementModel.findByIdAndUpdate(
                movementIdMongo,
                { ...updateMovementDto, updatedAt: new Date() },
                { new: true }
            );

            const diff = newAmount - prevAmount;
            if (diff != 0) {
                await AccountBalancesModel.updateOne(
                    {_id: prevMovement.account},
                    { $inc: { balance: diff } }
                )
            }

            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async deleteMovement( idMovement: string ) {

        try {

            if(!Validators.isMongoID(idMovement)) throw CustomError.badRequest('Invalid movement ID');
            const movementIdMongo = Validators.convertToUid(idMovement);

            const prevMovement = await MovementModel.findById(movementIdMongo);
            if (!prevMovement) throw CustomError.notFound('Movement not found');

            const amount = typeof prevMovement.amount === 'number'
                ? prevMovement.amount
                : Number(prevMovement.amount ?? 0);

            await AccountBalancesModel.updateOne(
                { _id: prevMovement.account },            // mismo _id que la cuenta en tu balances
                { $inc: { balance: -amount } }    // deshacer el efecto
            );

            const deletedMovement = await MovementModel.findByIdAndDelete(movementIdMongo);

            return {deletedMovement};
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getMovements() {

        try {

            const movements = await MovementModel.find()
                .populate('subsubcategory')
            

            return {
                movements: movements
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getMovementsByAccountId( idAccount: string ) {

        try {

            if(!Validators.isMongoID(idAccount)) throw CustomError.badRequest('Invalid account ID');
            const accountIdMongo = Validators.convertToUid(idAccount);

            // const [movements, balanceDoc] = await Promise.all([
            //     MovementModel.find({ account: accountIdMongo }).populate('category'),
            //     AccountBalancesModel.findById(accountIdMongo)
            // ]);

            // const balance = balanceDoc?.balance ?? 0;

            const movements = await MovementModel.find({ account: accountIdMongo })
                .populate('subsubcategory')

            const balanceDoc = await AccountBalancesModel.findById(accountIdMongo);
            
            const balance = balanceDoc?.balance ?? 0;

            return {
                movements,
                balance,
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

    async getMovementsById( idMovement: string ) {

        try {

            if(!Validators.isMongoID(idMovement)) throw CustomError.badRequest('Invalid account ID');
            const accountIdMongo = Validators.convertToUid(idMovement);

            const movement = await MovementModel.findById(accountIdMongo)
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

            return {movement};
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}