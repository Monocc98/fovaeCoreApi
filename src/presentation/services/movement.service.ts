import { getExternalConceptKeyFromCategory, Validators, parseDateDDMMYYYY } from "../../config";
import { AccountBalancesModel, MovementModel } from "../../data";
import { ConceptRuleModel } from "../../data/mongo/models/conceptRule.model";
import { MovementImportBatchModel } from "../../data/mongo/models/movementImportBatch.model";
import { CreateMovementDto, CustomError, UpdateMovementDto } from "../../domain";
import { ConfirmSolucionFactibleDto } from "../../domain/dtos/movement/confirmSolucionFactible.dto";

import { parse } from 'csv-parse/sync';
import type { Express } from 'express';
import { ImportSolucionFactibleDto } from "../../domain/dtos/movement/ImportSolucionFactible.dto";


interface SolucionFactibleRow {
  Numero: string;
  Fecha: string;
  Categoria: string;
  Nombre: string;
  Monto: string;
}

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

    // ========== NUEVO: 1) importar archivo y devolver resumen ==========
  async importSolucionFactible(
    dto: ImportSolucionFactibleDto,
    file: Express.Multer.File
  ) {
    try {
      const accountIdMongo = Validators.convertToUid(dto.accountId);

      const csvContent = file.buffer.toString('utf8');

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as SolucionFactibleRow[];

    const normalizedRows = records.map((row, index) => {
        const externalConceptKey = getExternalConceptKeyFromCategory(row.Categoria);

        const occurredAt = parseDateDDMMYYYY(row.Fecha);
        if (!occurredAt) {
            // puedes ajustar el mensaje si quieres algo más amigable
            throw CustomError.badRequest(
            `Fecha inválida en la fila ${index + 2} ("${row.Fecha}"). Se espera formato dd/MM/yyyy`
            );
        }

        return {
            externalNumber: row.Numero,
            occurredAt,
            externalCategoryRaw: row.Categoria,
            externalConceptKey,
            externalName: row.Nombre,
            amount: Number(row.Monto),
        };
    });

      const batch = await MovementImportBatchModel.create({
        account: accountIdMongo,
        source: 'SOLUCION_FACTIBLE',
        rows: normalizedRows,
        status: 'PENDING',
      });

      // Agrupar por concepto
      const conceptosMap = new Map<
        string,
        { externalCategoryRaw: string; count: number }
      >();

      for (const row of normalizedRows) {
        const key = row.externalConceptKey || 'SIN_CLAVE';
        const current = conceptosMap.get(key);

        if (!current) {
          conceptosMap.set(key, {
            externalCategoryRaw: row.externalCategoryRaw,
            count: 1,
          });
        } else {
          current.count += 1;
        }
      }

      const conceptKeys = Array.from(conceptosMap.keys());

      const existingRules = await ConceptRuleModel.find({
        account: accountIdMongo,
        externalConceptKey: { $in: conceptKeys },
      }).lean();

      const rulesByKey = new Map<string, any>();
      for (const rule of existingRules) {
        rulesByKey.set(rule.externalConceptKey, rule);
      }

      const concepts = conceptKeys.map((key) => {
        const info = conceptosMap.get(key)!;
        const rule = rulesByKey.get(key) || null;

        return {
          externalConceptKey: key,
          externalCategoryRaw: info.externalCategoryRaw,
          count: info.count,
          existingRule: rule
            ? {
                id: rule._id,
                subsubcategory: rule.subsubcategory,
                timesConfirmed: rule.timesConfirmed,
                timesCorrected: rule.timesCorrected,
                locked: rule.locked,
              }
            : null,
        };
      });

      return {
        importBatchId: batch._id,
        accountId: dto.accountId,
        source: 'SOLUCION_FACTIBLE',
        totalRows: normalizedRows.length,
        concepts,
      };

    } catch (error) {
      throw CustomError.internalServer(`${ error }`);
    }
  }

  // ========== NUEVO: 2) confirmar conceptos e insertar movimientos ==========
  async confirmSolucionFactible(
    batchId: string,
    dto: ConfirmSolucionFactibleDto
  ) {
    try {
      if (!Validators.isMongoID(batchId)) {
        throw CustomError.badRequest('Invalid batchId');
      }
      const batchIdMongo = Validators.convertToUid(batchId);

      const batch = await MovementImportBatchModel.findById(batchIdMongo);
      if (!batch) throw CustomError.notFound('Batch not found');

      if (batch.status === 'PROCESSED') {
        throw CustomError.badRequest('Batch already processed');
      }

      const accountId = batch.account;

      const mapConceptToSubsub = new Map<string, string>();
      for (const c of dto.concepts) {
        mapConceptToSubsub.set(c.externalConceptKey, c.subsubcategoryId);
      }

      const keys = Array.from(mapConceptToSubsub.keys());
      const existingRules = await ConceptRuleModel.find({
        account: accountId,
        externalConceptKey: { $in: keys },
      });

      const rulesByKey = new Map<string, any>();
      for (const rule of existingRules) {
        rulesByKey.set(rule.externalConceptKey, rule);
      }

      // Crear / actualizar reglas
      for (const key of keys) {
        const chosenSubsub = mapConceptToSubsub.get(key)!;
        const existingRule = rulesByKey.get(key);

        if (!existingRule) {
          await ConceptRuleModel.create({
            account: accountId,
            externalConceptKey: key,
            subsubcategory: chosenSubsub,
            timesConfirmed: 1,
            timesCorrected: 0,
            locked: false,
            lastUsedAt: new Date(),
          });
        } else {
          if (String(existingRule.subsubcategory) === String(chosenSubsub)) {
            existingRule.timesConfirmed += 1;
          } else {
            existingRule.subsubcategory = chosenSubsub;
            existingRule.timesConfirmed = 1;
            existingRule.timesCorrected += 1;
          }
          existingRule.lastUsedAt = new Date();
          await existingRule.save();
        }
      }

      // Crear movimientos
      const movementsToInsert = (batch.rows as any[]).map((row) => {
        const subsubcategoryId = mapConceptToSubsub.get(row.externalConceptKey || 'SIN_CLAVE');

        if (!subsubcategoryId) {
          throw CustomError.badRequest(
            `No subsubcategory provided for concept ${row.externalConceptKey}`
          );
        }

        return {
          description: `${row.externalCategoryRaw} - ${row.externalName}`,
          comments: '',
          account: accountId,
          occurredAt: row.occurredAt,
          recordedAt: new Date(),
          amount: row.amount,
          source: 'SOLUCION_FACTIBLE',
          subsubcategory: subsubcategoryId,
          tags: [],
          transfererId: undefined,
          externalNumber: row.externalNumber,
          externalCategoryRaw: row.externalCategoryRaw,
          externalConceptKey: row.externalConceptKey,
          externalName: row.externalName,
          importBatchId: batch._id,
        };
      });

      await MovementModel.insertMany(movementsToInsert);

      batch.status = 'PROCESSED';
      await batch.save();

      // actualizar balance de la cuenta
      const totalAmount = movementsToInsert.reduce((acc, m) => acc + Number(m.amount ?? 0), 0);
      await AccountBalancesModel.updateOne(
        { _id: accountId },
        { $inc: { balance: totalAmount } }
      );

      return {
        message: 'Movements imported successfully',
        insertedCount: movementsToInsert.length,
      };

    } catch (error) {
      throw CustomError.internalServer(`${ error }`);
    }
  }

}