import mongoose from "mongoose";

const movementsSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  comments: {
    type: String,
    required: true,
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
    enum: ['MANUAL', 'SOLUCION_FACTIBLE', 'OTRO'],
  },
  subsubcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subsubcategory',
    required: true,
  },
  tags: {
    type: [String],
  },
  transfererId: {
    type: String,
  },
});

movementsSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const MovementModel = mongoose.model('Movement', movementsSchema);
