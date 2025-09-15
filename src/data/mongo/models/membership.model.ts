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
  roles: {
    type: [ String ],
    enum: ['ADMIN_ROLE', 'USER_ROLE', 'MANAGER_ROLE', 'VIEWER_ROLE'],
    default: ['USER_ROLE'],
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
