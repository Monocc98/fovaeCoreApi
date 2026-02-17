import {
  getExternalConceptKeyFromCategory,
  Validators,
  parseDateDDMMYYYY,
  parseDateOnly,
  toUtcDateKey,
  toUtcDateOnly,
  findHeaderRowIndex,
  buildHeaderMap,
} from "../../config";
import { AccountModel, MovementModel } from "../../data";
import { ConceptRuleModel } from "../../data/mongo/models/conceptRule.model";
import { FiscalYear_CompanyModel } from "../../data/mongo/models/fiscalYear_Company.model";
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
import { TransferService } from "./transfer.service";

interface SolucionFactibleRow {
  Cuenta: string;
  Numero: string;
  Fecha: string;
  Categoria: string;
  Nombre: string;
  Monto: string;
}

interface SolucionFactibleSection {
  label: string;
  rows: Record<string, string>[];
}

const normalizeSfHeader = (value: string) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const normalizeSfCell = (value: unknown) => String(value ?? "").trim();

const parseSolucionFactibleSections = (csvContent: string): SolucionFactibleSection[] => {
  const allLines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  const sections: SolucionFactibleSection[] = [];
  let i = 0;

  while (i < allLines.length) {
    const line = allLines[i] ?? "";
    const normalizedLine = normalizeSfHeader(line.replace(/^"|"$/g, ""));
    const isSectionLine = normalizedLine.startsWith("cuenta:");
    if (!isSectionLine) {
      i += 1;
      continue;
    }

    const sectionLabel = line.replace(/^"|"$/g, "").replace(/^Cuenta:\s*/i, "").trim();
    const headerLine = allLines[i + 1];
    if (!headerLine) break;

    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ";" : ",";

    const headerColumns = parse(headerLine, {
      columns: false,
      delimiter,
      trim: true,
      relax_quotes: true,
    }) as string[][];
    const rawHeaders = headerColumns[0] ?? [];
    if (!rawHeaders.length) {
      i += 1;
      continue;
    }

    const rows: Record<string, string>[] = [];
    i += 2;

    while (i < allLines.length) {
      const currentLine = allLines[i] ?? "";
      const normalizedCurrent = normalizeSfHeader(currentLine.replace(/^"|"$/g, ""));
      if (normalizedCurrent.startsWith("cuenta:")) break;
      if (normalizedCurrent.startsWith("total")) {
        i += 1;
        break;
      }

      const parsedRows = parse(currentLine, {
        columns: false,
        delimiter,
        trim: true,
        relax_quotes: true,
        skip_empty_lines: true,
      }) as string[][];
      const values = parsedRows[0] ?? [];
      if (!values.length) {
        i += 1;
        continue;
      }

      const row: Record<string, string> = {};
      for (let idx = 0; idx < rawHeaders.length; idx++) {
        row[rawHeaders[idx] ?? ""] = values[idx] ?? "";
      }

      rows.push(row);
      i += 1;
    }

    sections.push({ label: sectionLabel, rows });
  }

  return sections;
};

const extractTransferReferenceExternalNumber = (value: string): string | null => {
  const text = String(value ?? "");
  const match = text.match(/transferencia\s*\[[^:\]]+:\s*(\d+)\s*\]/i);
  return match?.[1] ? String(match[1]).trim() : null;
};

const toIdString = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value?.toString === "function" && value.toString() !== "[object Object]") {
    return value.toString();
  }
  if (typeof value?.id === "string") return value.id;
  if (value?._id) return toIdString(value._id);
  return null;
};

const extractRuleTreeIds = (rule: any) => {
  const subsubcategoryRef = rule?.subsubcategory;
  const subcategoryRef = subsubcategoryRef?.parent;
  const categoryRef = subcategoryRef?.parent;

  const subsubcategoryId = toIdString(subsubcategoryRef);
  const subcategoryId = toIdString(subcategoryRef);
  const categoryId = toIdString(categoryRef);

  return {
    subsubcategoryId,
    subcategoryId,
    categoryId,
  };
};

const normalizeFingerprintPart = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

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
    toUtcDateKey(params.occurredAt),
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
    toUtcDateKey(new Date(params.occurredAt)),
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

      const account = await AccountModel.findById(accountIdMongo)
        .select("company")
        .lean();
      if (!account) throw CustomError.notFound("Account not found");

      const now = new Date();
      const [currentFiscalYear] = await FiscalYear_CompanyModel.aggregate([
        { $match: { company: account.company } },
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
                { $lte: ["$fy.startDate", now] },
                { $gt: ["$fyEnd", now] },
              ],
            },
          },
        },
        { $sort: { "fy.startDate": -1 } },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            fyStart: "$fy.startDate",
            fyEnd: 1,
          },
        },
      ]);

      const movementFilter: any = { account: accountIdMongo };
      if (currentFiscalYear?.fyStart && currentFiscalYear?.fyEnd) {
        movementFilter.occurredAt = {
          $gte: currentFiscalYear.fyStart,
          $lt: currentFiscalYear.fyEnd,
        };
      }

      const movements = await MovementModel.find(movementFilter).populate(
        "subsubcategory"
      );

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
      })
        .populate({
          path: "subsubcategory",
          select: "parent",
          populate: {
            path: "parent",
            select: "parent",
            populate: {
              path: "parent",
              select: "_id",
            },
          },
        })
        .lean();

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
          existingRule: (() => {
            if (!rule) return null;
            const tree = extractRuleTreeIds(rule);
            return {
              id: String(rule._id),
              subsubcategory: tree.subsubcategoryId,
              subsubcategoryId: tree.subsubcategoryId,
              subcategoryId: tree.subcategoryId,
              categoryId: tree.categoryId,
              timesConfirmed: rule.timesConfirmed,
              timesCorrected: rule.timesCorrected,
              locked: rule.locked,
            };
          })(),
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
  // ========== 1) importar archivo y devolver resumen ==========
  async importSolucionFactible(
    dto: ImportSolucionFactibleDto,
    file: Express.Multer.File
  ) {
    try {
      const accountIdMongo = Validators.convertToUid(dto.accountId);
      const primaryAccount = await AccountModel.findById(accountIdMongo)
        .select("_id company name")
        .lean();
      if (!primaryAccount) throw CustomError.notFound("Account not found");

      let investmentAccountIdMongo: any = null;
      if (dto.investmentAccountId) {
        investmentAccountIdMongo = Validators.convertToUid(dto.investmentAccountId);
        const investmentAccount = await AccountModel.findById(investmentAccountIdMongo)
          .select("_id company")
          .lean();
        if (!investmentAccount) throw CustomError.notFound("Investment account not found");
        if (String(investmentAccount.company) !== String(primaryAccount.company)) {
          throw CustomError.badRequest(
            "investmentAccountId must belong to the same company as accountId"
          );
        }
      }

      const csvContent = file.buffer.toString("utf8");
      const sections = parseSolucionFactibleSections(csvContent);
      if (!sections.length) {
        throw CustomError.badRequest(
          "No se encontraron secciones de cuenta en el CSV (formato 'Cuenta: ...')"
        );
      }

      const records: SolucionFactibleRow[] = [];
      for (const section of sections) {
        for (const raw of section.rows) {
          const mapped: Partial<SolucionFactibleRow> = { Cuenta: section.label };

          for (const [key, value] of Object.entries(raw)) {
            const nk = normalizeSfHeader(key);
            const normalizedValue = normalizeSfCell(value);
            if (nk === "numero") mapped.Numero = normalizedValue;
            else if (nk === "fecha") mapped.Fecha = normalizedValue;
            else if (nk.startsWith("categoria")) mapped.Categoria = normalizedValue;
            else if (nk === "nombre" || nk === "pagado a" || nk === "pagadoa")
              mapped.Nombre = normalizedValue;
            else if (nk === "monto") mapped.Monto = normalizedValue;
          }

          const hasAnyValue = Boolean(
            mapped.Numero ||
              mapped.Fecha ||
              mapped.Categoria ||
              mapped.Nombre ||
              mapped.Monto
          );
          if (!hasAnyValue) continue;
          if (!mapped.Numero || !mapped.Fecha || !mapped.Categoria || !mapped.Monto) {
            continue;
          }
          records.push(mapped as SolucionFactibleRow);
        }
      }

      if (!records.length) {
        throw CustomError.badRequest("No se encontraron filas de datos validas en el CSV");
      }

      const normalizedRowsWithMeta = records
        .map((row, index) => {
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

          const occurredAt = parseDateDDMMYYYY(row.Fecha);
          if (!occurredAt) {
            throw CustomError.badRequest(
              `Fecha invalida en la fila de datos #${index + 1} ("${row.Fecha}")`
            );
          }

          const amountNumber = Number(
            String(row.Monto).replace(/,/g, "").replace(/\s+/g, "")
          );
          if (Number.isNaN(amountNumber)) {
            throw CustomError.badRequest(
              `Monto invalido en la fila de datos #${index + 1} ("${row.Monto}")`
            );
          }

          const sourceAccountLabel = String(row.Cuenta ?? "").trim();
          const isInvestmentSection = /inversion/i.test(sourceAccountLabel);
          const targetAccount =
            isInvestmentSection && investmentAccountIdMongo
              ? investmentAccountIdMongo
              : accountIdMongo;

          const transferRefExternalNumber = extractTransferReferenceExternalNumber(
            row.Nombre
          );
          const isTransferCandidate = Boolean(transferRefExternalNumber);
          const pairA = externalNumber;
          const pairB = transferRefExternalNumber ?? externalNumber;
          const transferPairKey = [pairA, pairB].sort().join("|");

          return {
            account: targetAccount,
            sourceAccountLabel,
            externalNumber,
            occurredAt,
            externalCategoryRaw: row.Categoria,
            externalConceptKey: getExternalConceptKeyFromCategory(row.Categoria),
            externalName: row.Nombre,
            amount: amountNumber,
            transferRefExternalNumber,
            isTransferCandidate,
            transferPairKey,
            rowNumber: index + 1,
          };
        })
        .filter((r) => r !== null) as Array<any>;

      if (!normalizedRowsWithMeta.length) {
        throw CustomError.badRequest(
          "Todas las filas fueron descartadas (por categoria ignorada o datos invalidos)"
        );
      }

      const seenExternalNumbers = new Map<string, number>();
      for (const row of normalizedRowsWithMeta) {
        const dedupeKey = `${String(row.account)}:${row.externalNumber}`;
        const firstRow = seenExternalNumbers.get(dedupeKey);
        if (firstRow !== undefined) {
          throw CustomError.badRequest(
            `Id externo duplicado "${row.externalNumber}" para la misma cuenta en filas #${firstRow} y #${row.rowNumber}`
          );
        }
        seenExternalNumbers.set(dedupeKey, row.rowNumber);
      }

      const normalizedRows = normalizedRowsWithMeta.map(({ rowNumber, ...row }) => row);

      const batch = await MovementImportBatchModel.create({
        account: accountIdMongo,
        source: "SOLUCION_FACTIBLE",
        rows: normalizedRows,
        status: "PENDING",
      });

      const conceptosMap = new Map<
        string,
        { externalCategoryRaw: string; count: number }
      >();

      for (const row of normalizedRows.filter((r: any) => !r.isTransferCandidate)) {
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
      const accountIdsForRules = Array.from(
        new Set(normalizedRows.map((r: any) => String(r.account)))
      ).map((id) => Validators.convertToUid(id));

      const existingRules = await ConceptRuleModel.find({
        account: { $in: accountIdsForRules },
        externalConceptKey: { $in: conceptKeys },
      })
        .populate({
          path: "subsubcategory",
          select: "parent",
          populate: {
            path: "parent",
            select: "parent",
            populate: {
              path: "parent",
              select: "_id",
            },
          },
        })
        .lean();

      const rulesByKey = new Map<string, any>();
      for (const rule of existingRules) {
        rulesByKey.set(`${String(rule.account)}::${rule.externalConceptKey}`, rule);
      }

      const concepts = conceptKeys.map((key) => {
        const info = conceptosMap.get(key)!;
        const rule = rulesByKey.get(`${String(accountIdMongo)}::${key}`) || null;

        return {
          externalConceptKey: key,
          externalCategoryRaw: info.externalCategoryRaw,
          count: info.count,
          existingRule: (() => {
            if (!rule) return null;
            const tree = extractRuleTreeIds(rule);
            return {
              id: rule._id,
              subsubcategory: tree.subsubcategoryId,
              subsubcategoryId: tree.subsubcategoryId,
              subcategoryId: tree.subcategoryId,
              categoryId: tree.categoryId,
              timesConfirmed: rule.timesConfirmed,
              timesCorrected: rule.timesCorrected,
              locked: rule.locked,
            };
          })(),
        };
      });

      return {
        importBatchId: batch._id,
        accountId: dto.accountId,
        source: "SOLUCION_FACTIBLE",
        totalRows: normalizedRows.length,
        transferCandidatesCount: normalizedRows.filter((r: any) => r.isTransferCandidate).length,
        detectedSections: Array.from(
          new Set(normalizedRows.map((r: any) => String(r.sourceAccountLabel || "")))
        ),
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

      const defaultAccountId = batch.account;
      const transferService = new TransferService();

      const mapConceptToSubsub = new Map<string, string>();
      for (const c of dto.concepts) {
        mapConceptToSubsub.set(c.externalConceptKey, c.subsubcategoryId);
      }

      const keys = Array.from(mapConceptToSubsub.keys());
      const rows = batch.rows as any[];
      const accountIdsFromRows = Array.from(
        new Set(rows.map((row) => String(row.account || defaultAccountId)))
      ).map((id) => Validators.convertToUid(id));

      const existingRules = await ConceptRuleModel.find({
        account: { $in: accountIdsFromRows },
        externalConceptKey: { $in: keys },
      });

      const rulesByKey = new Map<string, any>();
      for (const rule of existingRules) {
        rulesByKey.set(`${String(rule.account)}::${rule.externalConceptKey}`, rule);
      }

      // Crear / actualizar reglas
      for (const accountId of accountIdsFromRows) {
        for (const key of keys) {
          const chosenSubsub = mapConceptToSubsub.get(key)!;
          const existingRule = rulesByKey.get(`${String(accountId)}::${key}`);

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
      }
      const source = "SOLUCION_FACTIBLE";
      const externalNumbers = rows.map(
        (row) => `${String(row.account || defaultAccountId)}::${String(row.externalNumber)}`
      );

      const existingMovements = await MovementModel.find({
        source,
        $expr: {
          $in: [
            { $concat: [{ $toString: "$account" }, "::", { $ifNull: ["$externalNumber", ""] }] },
            externalNumbers,
          ],
        },
      }).lean();

      const existingByExternalNumber = new Map<string, any>();
      for (const movement of existingMovements) {
        const key = `${String(movement.account)}::${String(movement.externalNumber)}`;
        existingByExternalNumber.set(key, movement);
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
              return toUtcDateOnly(new Date(row.occurredAt)).getTime();
            })
          )
        ).map((t) => new Date(t));

        const servoCandidates = await MovementModel.find({
          account: { $in: accountIdsFromRows },
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

      const rowsByExternal = new Map<string, any[]>();
      for (const row of rows) {
        const ext = String(row.externalNumber ?? "").trim();
        if (!ext) continue;
        const list = rowsByExternal.get(ext) ?? [];
        list.push(row);
        rowsByExternal.set(ext, list);
      }

      const processedTransferPairs = new Set<string>();
      let transferCreatedCount = 0;

      for (const row of rows) {
        const externalNumber = String(row.externalNumber ?? "").trim();
        if (!externalNumber) {
          throw CustomError.badRequest("Id externo vacio en batch de importacion");
        }

        const accountForRow = Validators.convertToUid(
          String(row.account || defaultAccountId)
        );
        const existingKey = `${String(accountForRow)}::${externalNumber}`;
        const existing = existingByExternalNumber.get(existingKey);

        if (row.isTransferCandidate && row.transferRefExternalNumber) {
          const pairKey = String(row.transferPairKey || "");
          if (pairKey && processedTransferPairs.has(pairKey)) {
            continue;
          }

          const counterpartCandidates =
            rowsByExternal.get(String(row.transferRefExternalNumber)) ?? [];
          const counterpart = counterpartCandidates.find(
            (candidate) =>
              String(candidate.transferRefExternalNumber || "") === externalNumber &&
              String(candidate.account || "") !== String(accountForRow)
          );

          if (!counterpart) {
            reviewItems.push({
              externalNumber,
              externalConceptKey: row.externalConceptKey ?? null,
              externalName: String(row.externalName || ""),
              occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
              amount: Number(row.amount ?? 0),
              reason: "AMBIGUOUS_MATCH",
              matchedCount: 0,
            });
            continue;
          }

          const counterpartAccount = Validators.convertToUid(
            String(counterpart.account || defaultAccountId)
          );
          const amount = Math.abs(Number(row.amount ?? 0));
          const rowDate = toUtcDateOnly(new Date(row.occurredAt)).getTime();
          const counterpartDate = toUtcDateOnly(
            new Date(counterpart.occurredAt)
          ).getTime();
          const sameDate = rowDate === counterpartDate;
          const oppositeAmounts =
            Number(row.amount ?? 0) + Number(counterpart.amount ?? 0) === 0;

          if (!sameDate || !oppositeAmounts || amount === 0) {
            reviewItems.push({
              externalNumber,
              externalConceptKey: row.externalConceptKey ?? null,
              externalName: String(row.externalName || ""),
              occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
              amount: Number(row.amount ?? 0),
              reason: "POSSIBLE_UPDATE",
              matchedCount: 1,
              matchedExternalNumber: String(counterpart.externalNumber || ""),
              matchedAmount: Number(counterpart.amount ?? 0),
            });
            continue;
          }

          const fromAccount =
            Number(row.amount ?? 0) < 0 ? String(accountForRow) : String(counterpartAccount);
          const toAccount =
            Number(row.amount ?? 0) > 0 ? String(accountForRow) : String(counterpartAccount);

          const occurredOn = toUtcDateOnly(new Date(row.occurredAt))
            .toISOString()
            .slice(0, 10);

          await transferService.createTransfer({
            company: undefined,
            fromAccount,
            toAccount,
            amount,
            currency: "MXN",
            occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
            description: "Transferencia interna detectada en importacion SF",
            comments: `SF ${externalNumber}<->${String(
              counterpart.externalNumber || ""
            )}`,
            transfererId: "IMPORT_SOLUCION_FACTIBLE",
            idempotencyKey: `SF-${pairKey}-${occurredOn}-${amount.toFixed(2)}`,
          } as any);

          transferCreatedCount += 1;
          if (pairKey) processedTransferPairs.add(pairKey);
          skippedCount += 1;
          continue;
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

        if (!existing) {
          if (isServoBatch) {
            const identityKey = buildServoReviewIdentity({
              occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
              conceptKey: String(row.externalConceptKey || "SIN_CLAVE"),
              alumno: String(row.externalName || ""),
            });
            const candidates = servoCandidatesByIdentity.get(identityKey) ?? [];

            if (candidates.length > 1) {
              reviewItems.push({
                externalNumber,
                externalConceptKey: row.externalConceptKey ?? null,
                externalName: String(row.externalName || ""),
                occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
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
                occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
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
            account: accountForRow,
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
          toUtcDateOnly(new Date(existing.occurredAt)).getTime() ===
          toUtcDateOnly(new Date(row.occurredAt)).getTime();
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
            occurredAt: toUtcDateOnly(new Date(row.occurredAt)),
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
        transferCreatedCount,
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

          const occurredAtDateOnly = parseDateOnly(occurredAt);
          if (!occurredAtDateOnly) {
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
            occurredAt: occurredAtDateOnly,
            conceptKey: externalConceptKey,
            alumno,
            matricula,
            amount,
          });

          return {
            externalNumber: servoFingerprint,
            occurredAt: occurredAtDateOnly,
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
      })
        .populate({
          path: "subsubcategory",
          select: "parent",
          populate: {
            path: "parent",
            select: "parent",
            populate: {
              path: "parent",
              select: "_id",
            },
          },
        })
        .lean();

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
          existingRule: (() => {
            if (!rule) return null;
            const tree = extractRuleTreeIds(rule);
            return {
              id: rule._id,
              subsubcategory: tree.subsubcategoryId,
              subsubcategoryId: tree.subsubcategoryId,
              subcategoryId: tree.subcategoryId,
              categoryId: tree.categoryId,
              timesConfirmed: rule.timesConfirmed,
              timesCorrected: rule.timesCorrected,
              locked: rule.locked,
            };
          })(),
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
