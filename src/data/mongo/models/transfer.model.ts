import mongoose from "mongoose";

const transferSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: "MXN",
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
  description: {
    type: String,
    required: true,
  },
  comments: {
    type: String,
  },
  transfererId: {
    type: String,
  },
  idempotencyKey: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ["COMPLETED", "CANCELLED"],
    default: "COMPLETED",
  },
});

transferSchema.index(
  { company: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

transferSchema.index({ company: 1, occurredAt: -1 });

transferSchema.set("toJSON", {
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

    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    obj.occurredOn = occurredOn;
    return obj;
  },
});

export const TransferModel = mongoose.model("Transfer", transferSchema);
