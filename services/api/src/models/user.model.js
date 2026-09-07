import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    firebaseUID: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userName: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: [true, "Name is required"],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);