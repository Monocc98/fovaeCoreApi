import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [ true, 'Name is required' ],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  scope: {
    type: String,
    required: true,
    enum: ['COMPANY', 'ACCOUNT'],
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE'],
  },
  sortIndex: {
    type: Number,
    default: 0,
  },
  bucket: {
    type: String,
    enum: ['INCOME', "FIXED_EXPENSE", "VARIABLE_EXPENSE", "FAMILY", "OTHER"],
  },

});

categorySchema.index({ company: 1, name: 1 }, { unique: true });

categorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const CategoryModel = mongoose.model('Category', categorySchema);
