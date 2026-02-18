import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: [true, "sessionId is required"],
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, "tokenHash is required"],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "expiresAt is required"],
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

authSessionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    const { _id, tokenHash, replacedByTokenHash, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    return obj;
  },
});

export const AuthSessionModel = mongoose.model("AuthSession", authSessionSchema);
