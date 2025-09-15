import mongoose from "mongoose";

const accountsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [ true, 'Name is required' ],
    unique: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['MOVEMENTS', 'INVESTMENT', 'CASH'],
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'disabled'],
    default: 'active',
  },

});

accountsSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const AccountModel = mongoose.model('Account', accountsSchema);
