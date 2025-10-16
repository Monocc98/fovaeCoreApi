import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema({
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    subsubcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subsubcategory',
      required: true,
      
    }

});

budgetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const BudgetModel = mongoose.model('Budget', budgetSchema);
