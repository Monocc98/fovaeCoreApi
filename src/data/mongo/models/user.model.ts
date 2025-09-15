import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: [ true, 'Name is required' ],
    },
    email: {
        type: String,
        required: [ true, 'Email is required' ],
        unique: true,
    },
    password: {
        type: String,
        required: [ true, 'Password is required' ],
    },
    img: {
        type: String,
    },
    role: {
        type:[ String ],
        default: 'USER_ROLE',
        enum: ['ADMIN_ROLE', 'USER_ROLE'],
    }
  // agrega createdAt y updatedAt automáticos
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    // elimina _id sin usar delete (TS estricto)
    const { _id, ...obj } = ret;
    obj.id = _id?.toString?.() ?? _id;
    delete ret.password;
    return obj;
  },
})

export const UserModel = mongoose.model('User', userSchema);