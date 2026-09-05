import dotenv from "dotenv"
dotenv.config()
import {app} from "./app.js"
import {connectDB} from "./db/db.js"

const PORT = process.env.PORT || 4000
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at port ${process.env.PORT}\n`)
        })
    })
    .catch((error) => {
        console.log("MONGO DB connection failed !!! \n", error);
    })