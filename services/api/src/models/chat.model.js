import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
    },
    { timestamps: true, _id: false }
);

const chatSchema = new Schema(
    {
        firebaseUID: {
            type: String,
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        location: {
            lat: Number,
            lon: Number,
            name: String,
        },
        messages: {
            type: [messageSchema],
            default: [],
        },
    },
    { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);