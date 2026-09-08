import express from "express"

const app = express()

app.use(express.json({ limit: "8000kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

import userRouter from "./routes/user.route.js"
import weatherRouter from "./routes/weather.route.js"
import chatRouter from "./routes/chat.route.js"
import locationRouter from "./routes/location.route.js"
import rainRouter from "./routes/rain.route.js"
import forecastIntelligenceRouter from "./routes/forecastIntelligence.route.js"
import explainRouter from "./routes/explain.route.js"

app.use("/api/v1/weather", weatherRouter)
app.use("/api/v1/weather", rainRouter)
app.use("/api/v1/weather", forecastIntelligenceRouter)
app.use("/api/v1/chat", chatRouter)
app.use("/api/v1/auth", userRouter)
app.use("/api/v1/locations", locationRouter)
app.use("/api/v1/explain", explainRouter)

export { app }