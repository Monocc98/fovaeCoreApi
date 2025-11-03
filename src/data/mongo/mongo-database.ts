import mongoose from "mongoose";




interface Options {
    mongoUrl: string;
    dbName: string;
}

export class MongoDatabase {

    static async connect(options: Options) {
        const { mongoUrl, dbName } = options;

        try {
            // 🔹 Plugin global para transformar _id → id y quitar __v
            mongoose.plugin((schema) => {
                schema.set("toJSON", {
                    virtuals: true,
                    versionKey: false,
                    transform: (_, ret) => {
                        ret.id = ret._id;
                        delete ret._id;
                    },
                });

                schema.set("toObject", {
                    virtuals: true,
                    versionKey: false,
                    transform: (_, ret) => {
                        ret.id = ret._id;
                        delete ret._id;
                    },
                });
            });
            
            await mongoose.connect(mongoUrl, {
                dbName,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 20000,
                family: 4, // fuerza IPv4 por si acaso
            });
            console.log('MongoDB Connected');
            
            return true;
            
        } catch (error) {

            console.log('MongoDB connection error:');
            throw error;
            
        }
    }

}