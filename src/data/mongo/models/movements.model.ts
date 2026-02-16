import mongoose from "mongoose";

const movementsSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  comments: {
    type: String,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  occurredAt: {
    type: Date,
    required: true,
  },
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
  amount: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    default: 'MANUAL',
    enum: ['MANUAL', 'SOLUCION_FACTIBLE', 'TRANSFER', 'OTRO'],
  },
  subsubcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subsubcategory',
    required: function (this: any) {
      return this.source !== 'TRANSFER';
    },
  },
  tags: {
    type: [String],
  },
  transfererId: {
    type: String,
  },
    externalNumber: {
    type: String, // "Numero" del CSV
  },
  externalCategoryRaw: {
    type: String, // texto completo de "Categoria" ej. "Colegiaturas [60101001]"
  },
  externalConceptKey: {
    type: String, // ej. "60101001" (la parte entre corchetes)
    index: true,
  },
  externalName: {
    type: String, // "Nombre" del CSV
  },
  importBatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MovementImportBatch',
  },
  transfer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transfer',
  },
  counterpartyAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  transferDirection: {
    type: String,
    enum: ['OUT', 'IN'],
  },
});

movementsSchema.index(
  { account: 1, source: 1, externalNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalNumber: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

movementsSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    const occurredAt =
      ret.occurredAt !== undefined && ret.occurredAt !== null
        ? new Date(ret.occurredAt)
        : null;
    const occurredOn =
      occurredAt && !Number.isNaN(occurredAt.getTime())
        ? occurredAt.toISOString().slice(0, 10)
        : null;

    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    obj.occurredOn = occurredOn;
    return obj;
  },
})

export const MovementModel = mongoose.model('Movement', movementsSchema);
