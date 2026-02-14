import {
  getExternalConceptKeyFromCategory,
  Validators,
  parseDateDDMMYYYY,
  findHeaderRowIndex,
  buildHeaderMap,
} from "../../config";
import { MovementModel } from "../../data";
import { ConceptRuleModel } from "../../data/mongo/models/conceptRule.model";
import { MovementImportBatchModel } from "../../data/mongo/models/movementImportBatch.model";
import {
  CreateMovementDto,
  CustomError,
  UpdateMovementDto,
} from "../../domain";
import { ConfirmSolucionFactibleDto } from "../../domain/dtos/movement/confirmSolucionFactible.dto";

import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { Express } from "express";
import { ImportSolucionFactibleDto } from "../../domain/dtos/movement/ImportSolucionFactible.dto";

interface SolucionFactibleRow {
  Numero: string;
  Fecha: string;
  Categoria: string;
  Nombre: string;
  Monto: string;
}

const normalizeFingerprintPart = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildServoFingerprint = (params: {
  occurredAt: Date;
  conceptKey: string;
  alumno: string;
  matricula: string;
  amount: number;
}) => {
  const amountKey = Number(params.amount ?? 0).toFixed(2);
  return [
    "SERVO",
    toLocalDateKey(params.occurredAt),
    normalizeFingerprintPart(params.conceptKey),
    normalizeFingerprintPart(params.alumno),
    normalizeFingerprintPart(params.matricula),
    amountKey,
  ].join("|");
};

const buildServoReviewIdentity = (params: {
  occurredAt: Date;
  conceptKey: string;
  alumno: string;
}) =>
  [
    toLocalDateKey(new Date(params.occurredAt)),
    normalizeFingerprintPart(params.conceptKey),
    normalizeFingerprintPart(params.alumno),
  ].join("|");

// 🔹 Claves externas que NO queremos importar
const IGNORED_EXTERNAL_KEYS = new Set<string>(["60101001"]);

export class MovementService {
  // DI
  constructor() {}

  async createMovement(createMovementDto: CreateMovementDto) {
    try {
      const movement = new MovementModel({
        ...createMovementDto,
        recordedAt: new Date(),
      });

      await movement.save();

      return {
        movement,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async updateMovement(
    idMovement: string,
    updateMovementDto: UpdateMovementDto
  ) {
    try {
      if (!Validators.isMongoID(idMovement))
        throw CustomError.badRequest("Invalid movement ID");
      const movementIdMongo = Validators.convertToUid(idMovement);

      const prevMovement = await MovementModel.findById(movementIdMongo);
      if (!prevMovement) throw CustomError.notFound("Movement not found");

      const updatedMovement = await MovementModel.findByIdAndUpdate(
        movementIdMongo,
        { ...updateMovementDto, updatedAt: new Date() },
        { new: true }
      );

      return { movement: updatedMovement };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async deleteMovement(idMovement: string) {
    try {
      if (!Validators.isMongoID(idMovement))
        throw CustomError.badRequest("Invalid movement ID");
      const movementIdMongo = Validators.convertToUid(idMovement);

      const prevMovement = await MovementModel.findById(movementIdMongo);
      if (!prevMovement) throw CustomError.notFound("Movement not found");

      const deletedMovement = await MovementModel.findByIdAndDelete(
        movementIdMongo
      );

      return { deletedMovement };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async getMovements() {
    try {
      const movements = await MovementModel.find().populate("subsubcategory");

      return {
        movements: movements,
      };
    } catch (error) {
      console.log(error);

      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async getMovementsByAccountId(idAccount: string) {
    try {
      if (!Validators.isMongoID(idAccount))
        throw CustomError.badRequest("Invalid account ID");
      const accountIdMongo = Validators.convertToUid(idAccount);

      const movements = await MovementModel.find({
        account: accountIdMongo,
      }).populate("subsubcategory");

      const balance = movements.reduce(
        (acc: number, movement: any) => acc + Number(movement.amount ?? 0),
        0
      );

      return {
        movements,
        balance,
      };
    } catch (error) {
      console.log(error);

      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async getMovementsById(idMovement: string) {
    try {
      if (!Validators.isMongoID(idMovement))
        throw CustomError.badRequest("Invalid account ID");
      const accountIdMongo = Validators.convertToUid(idMovement);

      const movement = await MovementModel.findById(accountIdMongo).populate({
        path: "subsubcategory",
        select: "name scope parent company",
        populate: {
          path: "parent", // subcategory (ref: 'Subcategory')
          select: "name scope parent company type",
          populate: {
            path: "parent", // category (ref: 'Category')
            select: "name scope company type",
          },
        },
      });

      return { movement };
    } catch (error) {
      console.log(error);

      throw CustomError.internalServer("Internal Server Error");
    }
  }

  async getPendingImportBatchesByAccount(accountId: string) {
    try {
      if (!Validators.isMongoID(accountId)) {
        throw CustomError.badRequest("Invalid accountId");
      }
      const accountIdMongo = Validators.convertToUid(accountId);

      const batches = await MovementImportBatchModel.find({
        account: accountIdMongo,
        status: "PENDING",
      })
        .sort({ createdAt: -1 })
        .select("_id source status createdAt rows") // rows para calcular conteo
        .lean();

      // Regresamos una vista ligera (para cards/lista)
      const result = batches.map((b: any) => ({
        id: String(b._id),
        source: b.source,
        status: b.status,
        createdAt: b.createdAt,
        totalRows: Array.isArray(b.rows) ? b.rows.length : 0,
        // opcional: count de conceptos sin resolver (si quieres, lo calculamos rápido)
      }));

      return { batches: result };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }

  async getImportBatchSummary(batchId: string) {
    try {
      if (!Validators.isMongoID(batchId)) {
        throw CustomError.badRequest("Invalid batchId");
      }
      const batchIdMongo = Validators.convertToUid(batchId);

      const batch = await MovementImportBatchModel.findById(
        batchIdMongo
      ).lean();
      if (!batch) throw CustomError.notFound("Batch not found");

      // Solo tiene sentido para pendientes (si quieres permitir ver PROCESSED, quita esto)
      if (batch.status !== "PENDING") {
        throw CustomError.badRequest("Batch is not pending");
      }

      const rows = Array.isArray((batch as any).rows)
        ? (batch as any).rows
        : [];
      if (!rows.length) {
        throw CustomError.badRequest("Batch has no rows");
      }

      // 1) agrupar por externalConceptKey
      const conceptosMap = new Map<
        string,
        { externalCategoryRaw: string; count: number }
      >();

      for (const r of rows) {
        const key = r.externalConceptKey || "SIN_CLAVE";
        const cur = conceptosMap.get(key);
        if (!cur) {
          conceptosMap.set(key, {
            externalCategoryRaw: r.externalCategoryRaw || "",
            count: 1,
          });
        } else {
          cur.count += 1;
        }
      }

      const conceptKeys = Array.from(conceptosMap.keys());

      // 2) rules existentes (por account + keys)
      const existingRules = await ConceptRuleModel.find({
        account: batch.account,
        externalConceptKey: { $in: conceptKeys },
      }).lean();

      const rulesByKey = new Map<string, any>();
      for (const rule of existingRules) {
        rulesByKey.set(rule.externalConceptKey, rule);
      }

      // 3) armar concepts como tu import
      const concepts = conceptKeys.map((key) => {
        const info = conceptosMap.get(key)!;
        const rule = rulesByKey.get(key) || null;

        return {
          externalConceptKey: key,
          externalCategoryRaw: info.externalCategoryRaw,
          count: info.count,
          existingRule: rule
            ? {
                id: String(rule._id),
                subsubcategory: rule.subsubcategory,
                timesConfirmed: rule.timesConfirmed,
                timesCorrected: rule.timesCorrected,
                locked: rule.locked,
              }
            : null,
        };
      });

      return {
        importBatchId: String(batch._id),
        accountId: String(batch.account),
        source: batch.source,
        status: batch.status,
        totalRows: rows.length,
        concepts,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
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
          .replace(/^\uFEFF/, "") // ✅ quita BOM si viene al inicio
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "") // quita acentos
          .trim();

      // ✅ regex tolerante a comillas/espacios y separador coma o ;
      const headerRegex =
        /^"?(numero)"?\s*([,;])\s*"?fecha"?\s*\2\s*"?categoria"?\b/;

      const headerIndex = allLines.findIndex((line) => {
        const norm = normalizeLine(line);
        return headerRegex.test(norm);
      });

      if (headerIndex === -1) {
        // Debug útil: imprime primeras 20 líneas normalizadas
        const sample = allLines.slice(0, 20).map(normalizeLine);
        console.log("CSV header scan sample:", sample);

        throw CustomError.badRequest(
          "No se encontró la cabecera (Numero, Fecha, Categoria) en el CSV"
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
        .map((raw, rawIndex) => {
          const mapped: Partial<SolucionFactibleRow> = {};

          for (const [key, value] of Object.entries(raw)) {
            const nk = normalizeHeader(key);

            if (nk === "numero") {
              mapped.Numero = String(value ?? "").trim();
            } else if (nk === "fecha") {
              mapped.Fecha = String(value ?? "").trim();
            } else if (nk.startsWith("categoria")) {
              mapped.Categoria = String(value ?? "").trim();
            } else if (
              nk === "nombre" ||
              nk === "pagado a" ||
              nk === "pagadoa"
            ) {
              // aceptamos tanto 'Nombre' como 'Pagado a'
              mapped.Nombre = String(value ?? "").trim();
            } else if (nk === "monto") {
              mapped.Monto = String(value ?? "").trim();
            }
          }

          // Validación mínima: que tenga Numero, Fecha, Categoria y Monto
          const csvRowNumber = headerIndex + 2 + rawIndex;
          const hasAnyValue = Boolean(
            mapped.Numero ||
              mapped.Fecha ||
              mapped.Categoria ||
              mapped.Nombre ||
              mapped.Monto
          );

          if (!hasAnyValue) {
            return null;
          }

          const numero = String(mapped.Numero ?? "").toLowerCase();
          const categoria = String(mapped.Categoria ?? "").toLowerCase();
          const nombre = String(mapped.Nombre ?? "").toLowerCase();
          const isFooterTotalRow =
            numero.includes("total") ||
            categoria.includes("total") ||
            nombre.includes("total");

          if (isFooterTotalRow && (!mapped.Fecha || !mapped.Categoria)) {
            return null;
          }

          if (!mapped.Numero) {
            throw CustomError.badRequest(
              `Id externo vacio en fila #${csvRowNumber} (columna Numero)`
            );
          }
          if (!mapped.Fecha || !mapped.Categoria || !mapped.Monto) {
            throw CustomError.badRequest(
              `Fila incompleta #${csvRowNumber}: se requiere Numero, Fecha, Categoria y Monto`
            );
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
      const normalizedRowsWithMeta = records
        .map((row, index) => {
          // ignorar exactamente "Colegiaturas [60101001]"
          const categoriaTrim = row.Categoria.trim();
          if (categoriaTrim === "Colegiaturas [60101001]") {
            return null;
          }

          const externalNumber = String(row.Numero ?? "").trim();
          if (!externalNumber) {
            throw CustomError.badRequest(
              `Id externo vacio en la fila de datos #${index + 1}`
            );
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
              `Monto inválido en la fila de datos #${index + 1} ("${
                row.Monto
              }")`
            );
          }

          return {
            externalNumber,
            occurredAt,
            externalCategoryRaw: row.Categoria,
            externalConceptKey,
            externalName: row.Nombre,
            amount: amountNumber,
            rowNumber: index + 1,
          };
        })
        .filter((r) => r !== null) as Array<{
        externalNumber: string;
        occurredAt: Date;
        externalCategoryRaw: string;
        externalConceptKey: string | null;
        externalName: string;
        amount: number;
        rowNumber: number;
      }>;

      if (!normalizedRowsWithMeta.length) {
        throw CustomError.badRequest(
          "Todas las filas fueron descartadas (por categoría ignorada o datos inválidos)"
        );
      }

      const seenExternalNumbers = new Map<string, number>();
      for (const row of normalizedRowsWithMeta) {
        const firstRow = seenExternalNumbers.get(row.externalNumber);
        if (firstRow !== undefined) {
          throw CustomError.badRequest(
            `Id externo duplicado "${row.externalNumber}" en filas de datos #${firstRow} y #${row.rowNumber}`
          );
        }
        seenExternalNumbers.set(row.externalNumber, row.rowNumber);
      }

      const normalizedRows = normalizedRowsWithMeta.map(
        ({ rowNumber, ...row }) => row
      );

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

      if (batch.status !== "PENDING") {
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
      const source = "SOLUCION_FACTIBLE";
      const rows = batch.rows as any[];
      const externalNumbers = rows.map((row) => String(row.externalNumber));

      const existingMovements = await MovementModel.find({
        account: accountId,
        source,
        externalNumber: { $in: externalNumbers },
      }).lean();

      const existingByExternalNumber = new Map<string, any>();
      for (const movement of existingMovements) {
        existingByExternalNumber.set(String(movement.externalNumber), movement);
      }

      const movementsToInsert: any[] = [];
      const updates: any[] = [];
      let skippedCount = 0;
      const reviewItems: Array<{
        externalNumber: string;
        externalConceptKey: string | null;
        externalName: string;
        occurredAt: Date;
        amount: number;
        reason: "POSSIBLE_UPDATE" | "AMBIGUOUS_MATCH";
        matchedCount?: number;
        matchedExternalNumber?: string;
        matchedAmount?: number;
      }> = [];

      const isServoBatch = batch.source === "SERVO_ESCOLAR";
      const servoCandidatesByIdentity = new Map<string, any[]>();
      if (isServoBatch) {
        const conceptKeysForLookup = Array.from(
          new Set(
            rows.map((row) => String(row.externalConceptKey || "SIN_CLAVE"))
          )
        );
        const namesForLookup = Array.from(
          new Set(rows.map((row) => String(row.externalName || "")))
        );
        const datesForLookup = Array.from(
          new Set(
            rows.map((row) => {
              const d = new Date(row.occurredAt);
              d.setHours(0, 0, 0, 0);
              return d.getTime();
            })
          )
        ).map((t) => new Date(t));

        const servoCandidates = await MovementModel.find({
          account: accountId,
          source,
          externalConceptKey: { $in: conceptKeysForLookup },
          externalName: { $in: namesForLookup },
          occurredAt: { $in: datesForLookup },
        }).lean();

        for (const movement of servoCandidates) {
          const key = buildServoReviewIdentity({
            occurredAt: new Date(movement.occurredAt),
            conceptKey: String(movement.externalConceptKey || "SIN_CLAVE"),
            alumno: String(movement.externalName || ""),
          });

          const list = servoCandidatesByIdentity.get(key) ?? [];
          list.push(movement);
          servoCandidatesByIdentity.set(key, list);
        }
      }

      for (const row of rows) {
        const externalNumber = String(row.externalNumber ?? "").trim();
        if (!externalNumber) {
          throw CustomError.badRequest("Id externo vacio en batch de importacion");
        }

        const subsubcategoryId = mapConceptToSubsub.get(
          row.externalConceptKey || "SIN_CLAVE"
        );

        if (!subsubcategoryId) {
          throw CustomError.badRequest(
            `No subsubcategory provided for concept ${row.externalConceptKey}`
          );
        }

        const description = `${row.externalCategoryRaw} - ${row.externalName}`;
        const existing = existingByExternalNumber.get(externalNumber);

        if (!existing) {
          if (isServoBatch) {
            const identityKey = buildServoReviewIdentity({
              occurredAt: new Date(row.occurredAt),
              conceptKey: String(row.externalConceptKey || "SIN_CLAVE"),
              alumno: String(row.externalName || ""),
            });
            const candidates = servoCandidatesByIdentity.get(identityKey) ?? [];

            if (candidates.length > 1) {
              reviewItems.push({
                externalNumber,
                externalConceptKey: row.externalConceptKey ?? null,
                externalName: String(row.externalName || ""),
                occurredAt: new Date(row.occurredAt),
                amount: Number(row.amount ?? 0),
                reason: "AMBIGUOUS_MATCH",
                matchedCount: candidates.length,
              });
              continue;
            }

            if (candidates.length === 1) {
              const candidate = candidates[0];
              const sameAmount =
                Number(candidate.amount ?? 0) === Number(row.amount ?? 0);

              if (sameAmount) {
                skippedCount += 1;
                continue;
              }

              reviewItems.push({
                externalNumber,
                externalConceptKey: row.externalConceptKey ?? null,
                externalName: String(row.externalName || ""),
                occurredAt: new Date(row.occurredAt),
                amount: Number(row.amount ?? 0),
                reason: "POSSIBLE_UPDATE",
                matchedCount: 1,
                matchedExternalNumber: String(candidate.externalNumber || ""),
                matchedAmount: Number(candidate.amount ?? 0),
              });
              continue;
            }
          }

          movementsToInsert.push({
            description,
            comments: "",
            account: accountId,
            occurredAt: row.occurredAt,
            recordedAt: new Date(),
            amount: row.amount,
            source,
            subsubcategory: subsubcategoryId,
            tags: [],
            transfererId: undefined,
            externalNumber,
            externalCategoryRaw: row.externalCategoryRaw,
            externalConceptKey: row.externalConceptKey,
            externalName: row.externalName,
            importBatchId: batch._id,
          });
          continue;
        }

        const sameAmount = Number(existing.amount ?? 0) === Number(row.amount ?? 0);
        const sameSubsubcategory =
          String(existing.subsubcategory) === String(subsubcategoryId);
        const sameOccurredAt =
          new Date(existing.occurredAt).getTime() ===
          new Date(row.occurredAt).getTime();
        const sameDescription = String(existing.description ?? "") === description;

        if (sameAmount && sameSubsubcategory && sameOccurredAt && sameDescription) {
          skippedCount += 1;
          continue;
        }

        if (isServoBatch) {
          reviewItems.push({
            externalNumber,
            externalConceptKey: row.externalConceptKey ?? null,
            externalName: String(row.externalName || ""),
            occurredAt: new Date(row.occurredAt),
            amount: Number(row.amount ?? 0),
            reason: "POSSIBLE_UPDATE",
            matchedCount: 1,
            matchedExternalNumber: String(existing.externalNumber || ""),
            matchedAmount: Number(existing.amount ?? 0),
          });
          continue;
        }

        updates.push({
          updateOne: {
            filter: { _id: existing._id },
            update: {
              $set: {
                description,
                comments: "",
                occurredAt: row.occurredAt,
                amount: row.amount,
                subsubcategory: subsubcategoryId,
                tags: [],
                transfererId: undefined,
                externalNumber,
                externalCategoryRaw: row.externalCategoryRaw,
                externalConceptKey: row.externalConceptKey,
                externalName: row.externalName,
                importBatchId: batch._id,
                updatedAt: new Date(),
              },
            },
          },
        });
      }

      if (movementsToInsert.length) {
        await MovementModel.insertMany(movementsToInsert);
      }

      if (updates.length) {
        await MovementModel.bulkWrite(updates);
      }

      batch.status =
        reviewItems.length > 0 ? "PROCESSED_WITH_REVIEW" : "PROCESSED";
      await batch.save();

      return {
        message: "Movements processed successfully",
        insertedCount: movementsToInsert.length,
        updatedCount: updates.length,
        skippedCount,
        reviewRequiredCount: reviewItems.length,
        reviewItems,
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
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
      });

      const headerRowIndex = findHeaderRowIndex(rows);
      if (headerRowIndex < 0) {
        throw CustomError.badRequest(
          "No pude detectar la fila de cabecera automáticamente."
        );
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
          if (
            !r ||
            r.every(
              (c) => c === null || c === undefined || String(c).trim() === ""
            )
          )
            return null;

          const occurredAtRaw = r[iFecha];
          const concRaw = r[iConc];
          const importeRaw = r[iImporte];

          // “totales” o filas raras: si no hay conc o importe -> fuera
          if (!concRaw || importeRaw === undefined || importeRaw === null)
            return null;

          // Fecha: Excel puede venir Date, número serial, o string
          let occurredAt: Date | null = null;
          if (occurredAtRaw instanceof Date) occurredAt = occurredAtRaw;
          else if (typeof occurredAtRaw === "number") {
            // XLSX interpreta serial; esto suele funcionar:
            const d = XLSX.SSF.parse_date_code(occurredAtRaw);
            if (d) occurredAt = new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S);
          } else if (typeof occurredAtRaw === "string") {
            occurredAt =
              parseDateDDMMYYYY(occurredAtRaw) ?? new Date(occurredAtRaw);
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
          const alumno =
            iNombre !== undefined ? String(r[iNombre] ?? "").trim() : "";
          const matricula =
            iMatricula !== undefined ? String(r[iMatricula] ?? "").trim() : "";
          const grupo =
            iGrupo !== undefined ? String(r[iGrupo] ?? "").trim() : "";
          const periodo =
            iPeriodo !== undefined ? String(r[iPeriodo] ?? "").trim() : "";
          const formaPago =
            iFormaPago !== undefined ? String(r[iFormaPago] ?? "").trim() : "";

          const servoFingerprint = buildServoFingerprint({
            occurredAt,
            conceptKey: externalConceptKey,
            alumno,
            matricula,
            amount,
          });

          return {
            externalNumber: servoFingerprint,
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
      const conceptosMap = new Map<
        string,
        { externalCategoryRaw: string; count: number }
      >();
      for (const row of normalizedRows) {
        const key = row.externalConceptKey || "SIN_CLAVE";
        const cur = conceptosMap.get(key);
        if (!cur)
          conceptosMap.set(key, {
            externalCategoryRaw: row.externalCategoryRaw,
            count: 1,
          });
        else cur.count += 1;
      }

      const conceptKeys = Array.from(conceptosMap.keys());

      const existingRules = await ConceptRuleModel.find({
        account: accountIdMongo,
        externalConceptKey: { $in: conceptKeys },
      }).lean();

      const rulesByKey = new Map(
        existingRules.map((r: any) => [r.externalConceptKey, r])
      );

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
