import mongoose from "mongoose";

const fiscalYear_CompanySchema = new mongoose.Schema({
  fiscalYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FiscalYear',
    required: [ true, 'fiscalYearId is required' ],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [ true, 'companyId is required' ],
  },
});

fiscalYear_CompanySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})



export const FiscalYear_CompanyModel = mongoose.model('FiscalYear_Company', fiscalYear_CompanySchema);
