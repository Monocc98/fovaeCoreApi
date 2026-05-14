import mongoose from "mongoose";

const companyFiscalProfileSchema = new mongoose.Schema(
  {
    rfc: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    legalName: {
      type: String,
      default: "",
      trim: true,
    },
    taxRegime: {
      type: String,
      default: "",
      trim: true,
    },
    fiscalZipCode: {
      type: String,
      default: "",
      trim: true,
    },
    fiscalEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    defaultSeries: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    nextFolio: {
      type: Number,
      default: 1,
      min: 1,
    },
    fiscalEnvironment: {
      type: String,
      enum: ["TEST", "PRODUCTION"],
      default: "TEST",
    },
    pacProvider: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [ true, 'Name is required' ],
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  fiscalProfile: {
    type: companyFiscalProfileSchema,
    default: () => ({}),
  },

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
