import mongoose from "mongoose";




interface Options {
    mongoUrl: string;
    dbName: string;
}

export class MongoDatabase {

    static async connect(options: Options) {
        const { mongoUrl, dbName } = options;

        try {
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