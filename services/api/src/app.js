import express from "express"

const app = express()

app.use(express.json({ limit: "8000kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

import userRouter from "./routes/user.route.js"
import weatherRouter from "./routes/weather.route.js"
import chatRouter from "./routes/chat.route.js"

app.use("/api/v1/weather", weatherRouter)
app.use("/api/v1/chat", chatRouter)
app.use("/api/v1/auth", userRouter)

export { app }