import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [ true, 'Name is required' ],
  },
  scope: {
    type: String,
    required: true,
    enum: ['COMPANY', 'ACCOUNT'],
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
});

subcategorySchema.index({ company: 1, parent: 1, name: 1 }, { unique: true });

subcategorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const SubcategoryModel = mongoose.model('Subcategory', subcategorySchema);
