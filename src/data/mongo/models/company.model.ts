import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [ true, 'Name is required' ],
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  }

});

companySchema.index({ group: 1, name: 1 }, { unique: true });

companySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const CompanyModel = mongoose.model('Company', companySchema);
