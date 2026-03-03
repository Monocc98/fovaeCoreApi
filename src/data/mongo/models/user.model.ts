import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    img: {
      type: String,
    },
    role: {
      type: String,
      default: "STANDARD",
      enum: ["STANDARD", "SUPER_ADMIN"],
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "disabled"],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    const { _id, password, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    if (!obj.status) obj.status = "active";
    return obj;
  },
});

export const UserModel = mongoose.model("User", userSchema);
