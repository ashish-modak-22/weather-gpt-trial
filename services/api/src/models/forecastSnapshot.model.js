import mongoose, { Schema } from "mongoose";

// Stores each forecast fetch per location so we can detect drift between runs
// ("forecast changed since last time we checked").
const forecastSnapshotSchema = new Schema(
    {
        locationKey: {
            // rounded "lat_lon" string — groups requests hitting roughly the same spot
            type: String,
            required: true,
            index: true,
        },
        daily: {
            type: [
                {
                    dt: Number,
                    tempMin: Number,
                    tempMax: Number,
                    pop: Number,
                    rain: Number,
                    condition: String,
                },
            ],
            default: [],
        },
        fetchedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

// keep only recent history per location — old snapshots aren't useful for trend detection
forecastSnapshotSchema.index({ locationKey: 1, fetchedAt: -1 });

export const ForecastSnapshot = mongoose.model("ForecastSnapshot", forecastSnapshotSchema);

export const toLocationKey = (lat, lon) => `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;