// src/models/movementImportBatch.model.ts
import mongoose from 'mongoose';

const movementImportBatchSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  source: {
    type: String,
    enum: ['SOLUCION_FACTIBLE'],
    required: true,
    default: 'SOLUCION_FACTIBLE',
  },
  rows: [
    {
      externalNumber: String,
      occurredAt: Date,
      externalCategoryRaw: String,
      externalConceptKey: String,
      externalName: String,
      amount: Number,
    },
  ],
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSED'],
    default: 'PENDING',
  },
});

movementImportBatchSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const MovementImportBatchModel = mongoose.model(
  'MovementImportBatch',
  movementImportBatchSchema
);

