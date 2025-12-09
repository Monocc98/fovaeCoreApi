import mongoose from "mongoose";

const conceptRuleSchema = new mongoose.Schema({
 account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },

  // Clave del concepto externo (ej. "60101001")
  externalConceptKey: {
    type: String,
    required: true,
  },

  // Subsubcategoría interna donde va a terminar
  subsubcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subsubcategory',
    required: true,
  },

  // Contadores para aprendizaje
  timesConfirmed: {
    type: Number,
    default: 0,
  },
  timesCorrected: {
    type: Number,
    default: 0,
  },

  locked: {
    type: Boolean,
    default: false, // "ya no me preguntes por este concepto"
  },

  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
});

conceptRuleSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
})

export const ConceptRuleModel  = mongoose.model('ConceptRule', conceptRuleSchema);
