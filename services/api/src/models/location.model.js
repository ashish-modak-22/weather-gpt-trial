import mongoose, { Schema } from "mongoose";

const locationSchema = new Schema(
    {
        firebaseUID: {
            type: String,
            required: true,
            index: true,
        },
        label: {
            type: String,
            required: [true, "Label is required"],
            trim: true,
        },
        resolvedBy: {
            type: String,
            enum: ["village", "pincode", "block", "district", "coordinates", "city"],
            required: true,
        },
        village: { type: String, trim: true },
        block: { type: String, trim: true },
        district: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// one user shouldn't have two "default" locations
locationSchema.index({ firebaseUID: 1, isDefault: 1 });

export const Location = mongoose.model("Location", locationSchema);