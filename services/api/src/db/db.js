import mongoose from "mongoose"

const connectDB = async () => {
    try {
        const mongoDBInstance = await mongoose.connect(`${process.env.MONGODB_DATABASE_URI}/${process.env.MONGO_DB_NAME}`)
        console.log(`\n MongoDB connected succesfully !! DB HOST = ${mongoDBInstance.connection.host}\n`)
    } catch (error) {
        console.log("MongoDB Connection Failed \n", error);
        process.exit(1)
    }
}

export { connectDB }