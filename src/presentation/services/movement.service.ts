import { getExternalConceptKeyFromCategory, Validators, parseDateDDMMYYYY, findHeaderRowIndex, buildHeaderMap } from "../../config";
import { AccountBalancesModel, MovementModel } from "../../data";
import { ConceptRuleModel } from "../../data/mongo/models/conceptRule.model";
import { MovementImportBatchModel } from "../../data/mongo/models/movementImportBatch.model";
import { CreateMovementDto, CustomError, UpdateMovementDto } from "../../domain";
import { ConfirmSolucionFactibleDto } from "../../domain/dtos/movement/confirmSolucionFactible.dto";

import { parse } from 'csv-parse/sync';
import * as XLSX from "xlsx";
import type { Express } from 'express';
import { ImportSolucionFactibleDto } from "../../domain/dtos/movement/ImportSolucionFactible.dto";


interface SolucionFactibleRow {
  Numero: string;
  Fecha: string;
  Categoria: string;
  Nombre: string;
  Monto: string;
}

// 🔹 Claves externas que NO queremos importar
const IGNORED_EXTERNAL_KEYS = new Set<string>(["60101001"]);

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

    // ========== 1) importar archivo y devolver resumen ==========
 async importSolucionFactible(
  dto: ImportSolucionFactibleDto,
  file: Express.Multer.File
) {
  try {
    const accountIdMongo = Validators.convertToUid(dto.accountId);

    const csvContent = file.buffer.toString("utf8");

    // 1) Partir en líneas y limpiar vacías
    const allLines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.trim() !== "");

    if (!allLines.length) {
      throw CustomError.badRequest("El archivo CSV está vacío");
    }

    // 2) Buscar la fila de encabezados (donde está 'Número,Fecha,Categoría,...')
    const normalizeLine = (line: string) =>
      line
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "") // quita acentos
        .trim();

    const headerIndex = allLines.findIndex((line) => {
      const norm = normalizeLine(line);
      // tolerante: numero,fecha,categoria con coma o punto y coma
      return (
        norm.startsWith("numero,fecha,categoria") ||
        norm.startsWith("numero;fecha;categoria")
      );
    });

    if (headerIndex === -1) {
      throw CustomError.badRequest(
        "No se encontró la cabecera 'Número, Fecha, Categoría' en el CSV"
      );
    }

    // 3) Quedarnos sólo con la parte desde el encabezado hacia abajo
    const dataLines = allLines.slice(headerIndex);

    // 4) Detectar delimitador (coma o punto y coma)
    const headerLine = dataLines[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;

    const delimiter = semicolonCount > commaCount ? ";" : ",";

    const csvOnlyData = dataLines.join("\n");

    // 5) Parsear con csv-parse usando esa cabecera
    const rawRecords = parse(csvOnlyData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    }) as Record<string, string>[];

    if (!rawRecords.length) {
      throw CustomError.badRequest(
        "No se encontraron filas de datos en el CSV"
      );
    }

    // 6) Normalizar encabezados → a nuestro modelo SolucionFactibleRow
    const normalizeHeader = (h: string) =>
      h
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "") // quita acentos
        .trim();

    const records: SolucionFactibleRow[] = rawRecords
      .map((raw) => {
        const mapped: Partial<SolucionFactibleRow> = {};

        for (const [key, value] of Object.entries(raw)) {
          const nk = normalizeHeader(key);

          if (nk === "numero") {
            mapped.Numero = String(value ?? "").trim();
          } else if (nk === "fecha") {
            mapped.Fecha = String(value ?? "").trim();
          } else if (nk.startsWith("categoria")) {
            mapped.Categoria = String(value ?? "").trim();
          } else if (nk === "nombre" || nk === "pagado a" || nk === "pagadoa") {
            // aceptamos tanto 'Nombre' como 'Pagado a'
            mapped.Nombre = String(value ?? "").trim();
          } else if (nk === "monto") {
            mapped.Monto = String(value ?? "").trim();
          }
        }

        // Validación mínima: que tenga Numero, Fecha, Categoria y Monto
        if (
          !mapped.Numero ||
          !mapped.Fecha ||
          !mapped.Categoria ||
          !mapped.Monto
        ) {
          return null; // descartamos filas incompletas
        }

        return mapped as SolucionFactibleRow;
      })
      .filter((r): r is SolucionFactibleRow => r !== null);

    if (!records.length) {
      throw CustomError.badRequest(
        "No se encontraron filas válidas (con Número, Fecha, Categoría y Monto) en el CSV"
      );
    }

    // 7) Normalizar filas + parsear fecha + extraer clave + ignorar colegiaturas
    const normalizedRows = records
      .map((row, index) => {
        // ignorar exactamente "Colegiaturas [60101001]"
        const categoriaTrim = row.Categoria.trim();
        if (categoriaTrim === "Colegiaturas [60101001]") {
          return null;
        }

        const externalConceptKey = getExternalConceptKeyFromCategory(
          row.Categoria
        );

        const occurredAt = parseDateDDMMYYYY(row.Fecha);
        if (!occurredAt) {
          throw CustomError.badRequest(
            `Fecha inválida en la fila de datos #${index + 1} ("${
              row.Fecha
            }"). Se espera formato dd/MM/yyyy`
          );
        }

        // limpiar monto (por si viene con comas como separador de miles)
        const amountNumber = Number(
          String(row.Monto).replace(/,/g, "").replace(/\s+/g, "")
        );
        if (Number.isNaN(amountNumber)) {
          throw CustomError.badRequest(
            `Monto inválido en la fila de datos #${index + 1} ("${row.Monto}")`
          );
        }

        return {
          externalNumber: row.Numero,
          occurredAt,
          externalCategoryRaw: row.Categoria,
          externalConceptKey,
          externalName: row.Nombre,
          amount: amountNumber,
        };
      })
      .filter((r) => r !== null) as Array<{
      externalNumber: string;
      occurredAt: Date;
      externalCategoryRaw: string;
      externalConceptKey: string | null;
      externalName: string;
      amount: number;
    }>;

    if (!normalizedRows.length) {
      throw CustomError.badRequest(
        "Todas las filas fueron descartadas (por categoría ignorada o datos inválidos)"
      );
    }

    // 8) Guardar batch en Mongo
    const batch = await MovementImportBatchModel.create({
      account: accountIdMongo,
      source: "SOLUCION_FACTIBLE",
      rows: normalizedRows,
      status: "PENDING",
    });

    // 9) Agrupar por concepto (de lo que sí quedó)
    const conceptosMap = new Map<
      string,
      { externalCategoryRaw: string; count: number }
    >();

    for (const row of normalizedRows) {
      const key = row.externalConceptKey || "SIN_CLAVE";
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
      source: "SOLUCION_FACTIBLE",
      totalRows: normalizedRows.length,
      concepts,
    };
  } catch (error) {
    throw CustomError.internalServer(`${error}`);
  }
}


  // ========== 2) confirmar conceptos e insertar movimientos ==========
  async confirmSolucionFactible(
    batchId: string,
    dto: ConfirmSolucionFactibleDto
  ) {
    try {
      if (!Validators.isMongoID(batchId)) {
        throw CustomError.badRequest("Invalid batchId");
      }
      const batchIdMongo = Validators.convertToUid(batchId);

      const batch = await MovementImportBatchModel.findById(batchIdMongo);
      if (!batch) throw CustomError.notFound("Batch not found");

      if (batch.status === "PROCESSED") {
        throw CustomError.badRequest("Batch already processed");
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
        const subsubcategoryId = mapConceptToSubsub.get(
          row.externalConceptKey || "SIN_CLAVE"
        );

        if (!subsubcategoryId) {
          throw CustomError.badRequest(
            `No subsubcategory provided for concept ${row.externalConceptKey}`
          );
        }

        return {
          description: `${row.externalCategoryRaw} - ${row.externalName}`,
          comments: "",
          account: accountId,
          occurredAt: row.occurredAt,
          recordedAt: new Date(),
          amount: row.amount,
          source: "SOLUCION_FACTIBLE",
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

      batch.status = "PROCESSED";
      await batch.save();

      const totalAmount = movementsToInsert.reduce(
        (acc, m) => acc + Number(m.amount ?? 0),
        0
      );
      await AccountBalancesModel.updateOne(
        { _id: accountId },
        { $inc: { balance: totalAmount } }
      );

      return {
        message: "Movements imported successfully",
        insertedCount: movementsToInsert.length,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async importServoEscolar(
  dto: ImportSolucionFactibleDto, // puedes crear ImportServoEscolarDto si quieres
  file: Express.Multer.File
) {
  try {
    const accountIdMongo = Validators.convertToUid(dto.accountId);

    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0]; // o “Hoja”
    const ws = wb.Sheets[sheetName];

    // rows como matriz (incluye filas “basura”)
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

    const headerRowIndex = findHeaderRowIndex(rows);
    if (headerRowIndex < 0) {
      throw CustomError.badRequest("No pude detectar la fila de cabecera automáticamente.");
    }

    const header = rows[headerRowIndex];
    const map = buildHeaderMap(header);

    const idx = (s?: string) =>
      s === undefined || s === "" ? undefined : Number(s);
    const iFecha = idx(map.fecha)!;
    const iConc = idx(map.conc)!;
    const iImporte = idx(map.importe)!;
    const iNombre = idx(map.nombre);
    const iMatricula = idx(map.matricula);
    const iGrupo = idx(map.grupo);
    const iPeriodo = idx(map.periodo);
    const iFormaPago = idx(map.formaPago);

    const dataRows = rows.slice(headerRowIndex + 1);

    const normalizedRows = dataRows
      .map((r, pos) => {
        // ignora filas vacías
        if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === "")) return null;

        const occurredAtRaw = r[iFecha];
        const concRaw = r[iConc];
        const importeRaw = r[iImporte];

        // “totales” o filas raras: si no hay conc o importe -> fuera
        if (!concRaw || importeRaw === undefined || importeRaw === null) return null;

        // Fecha: Excel puede venir Date, número serial, o string
        let occurredAt: Date | null = null;
        if (occurredAtRaw instanceof Date) occurredAt = occurredAtRaw;
        else if (typeof occurredAtRaw === "number") {
          // XLSX interpreta serial; esto suele funcionar:
          const d = XLSX.SSF.parse_date_code(occurredAtRaw);
          if (d) occurredAt = new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S);
        } else if (typeof occurredAtRaw === "string") {
          occurredAt = parseDateDDMMYYYY(occurredAtRaw) ?? new Date(occurredAtRaw);
        }

        if (!occurredAt || isNaN(occurredAt.getTime())) {
          throw CustomError.badRequest(
            `Fecha inválida en fila Excel ${headerRowIndex + 2 + pos}`
          );
        }

        const amount = Number(importeRaw);
        if (Number.isNaN(amount)) {
          throw CustomError.badRequest(
            `Importe inválido en fila Excel ${headerRowIndex + 2 + pos}`
          );
        }

        const externalConceptKey = String(concRaw).trim(); // ✅ agrupar por Conc
        const alumno = iNombre !== undefined ? String(r[iNombre] ?? "").trim() : "";
        const matricula = iMatricula !== undefined ? String(r[iMatricula] ?? "").trim() : "";
        const grupo = iGrupo !== undefined ? String(r[iGrupo] ?? "").trim() : "";
        const periodo = iPeriodo !== undefined ? String(r[iPeriodo] ?? "").trim() : "";
        const formaPago = iFormaPago !== undefined ? String(r[iFormaPago] ?? "").trim() : "";

        return {
          externalNumber: String(r[0] ?? ""), // “No.” si te sirve
          occurredAt,
          externalCategoryRaw: `ServoEscolar:${externalConceptKey}`, // o el texto que quieras
          externalConceptKey,
          externalName: alumno, // aquí guardas el alumno para trazabilidad
          amount, // ingresos: positivo
          meta: { matricula, grupo, periodo, formaPago },
        };
      })
      .filter(Boolean) as any[];

    const batch = await MovementImportBatchModel.create({
      account: accountIdMongo,
      source: "SERVO_ESCOLAR",
      rows: normalizedRows,
      status: "PENDING",
    });

    // Agrupar por concepto (Conc)
    const conceptosMap = new Map<string, { externalCategoryRaw: string; count: number }>();
    for (const row of normalizedRows) {
      const key = row.externalConceptKey || "SIN_CLAVE";
      const cur = conceptosMap.get(key);
      if (!cur) conceptosMap.set(key, { externalCategoryRaw: row.externalCategoryRaw, count: 1 });
      else cur.count += 1;
    }

    const conceptKeys = Array.from(conceptosMap.keys());

    const existingRules = await ConceptRuleModel.find({
      account: accountIdMongo,
      externalConceptKey: { $in: conceptKeys },
    }).lean();

    const rulesByKey = new Map(existingRules.map((r: any) => [r.externalConceptKey, r]));

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
      source: "SERVO_ESCOLAR",
      totalRows: normalizedRows.length,
      concepts,
    };
  } catch (error) {
    throw CustomError.internalServer(`${error}`);
  }
}

}