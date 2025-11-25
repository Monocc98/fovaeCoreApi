import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [ true, 'userId is required' ],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [ true, 'companyId is required' ],
  },
  role: {
    type: String,
    default: 'VIEWER',
    enum: ['VIEWER', 'ADMIN'],
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'disabled'],
    default: 'active',
  },
});

membershipSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})



export const MembershipModel = mongoose.model('Membership', membershipSchema);
