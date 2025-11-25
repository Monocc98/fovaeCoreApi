import mongoose from "mongoose";

const accountPermissionsSchema = new mongoose.Schema({
  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: [ true, 'membershipId is required' ],
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [ true, 'accountId is required' ],
  },
  canView: {
    type: Boolean,
    default: true,
  },
  canEdit: {
    type: Boolean,
    default: false,
  },
});

accountPermissionsSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})



export const AccountPermissionsModel = mongoose.model('AccountPermissions', accountPermissionsSchema);
