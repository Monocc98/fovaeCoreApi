import mongoose from "mongoose";

const accountBalancesSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0.0,
  },

});

accountBalancesSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const AccountBalancesModel = mongoose.model('AccountBalances', accountBalancesSchema);
