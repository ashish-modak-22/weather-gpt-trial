import { Location } from "../models/location.model.js";
import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveByPincode, resolveByVillage, resolveByDistrict } from "../services/location.service.js";
import { resolveLocation, fetchOneCall, extractCurrent, extractDaily } from "../services/weather.service.js";

// GET /search?mode=village|pincode|district|coordinates&value=...&state=...
// Resolves a hyperlocal location and returns it bundled with current + daily weather.
const searchHyperlocal = asyncHandler(async (req, res) => {
    const { mode, value, state, lat, lon } = req.query;

    if (!mode) throw new ApiError(400, "mode is required (village | pincode | district | coordinates)");

    let location;
    switch (mode) {
        case "pincode":
            if (!value) throw new ApiError(400, "value (pincode) is required");
            location = await resolveByPincode(value);
            break;
        case "village":
            if (!value) throw new ApiError(400, "value (village name) is required");
            location = await resolveByVillage(value);
            break;
        case "district":
        case "block":
            if (!value) throw new ApiError(400, "value (district name) is required");
            location = await resolveByDistrict(value, state);
            break;
        case "coordinates":
            if (!lat || !lon) throw new ApiError(400, "lat and lon are required");
            location = await resolveLocation({ lat, lon });
            location.resolvedBy = "coordinates";
            break;
        default:
            throw new ApiError(400, "Invalid mode");
    }

    const oneCall = await fetchOneCall(location.lat, location.lon);

    return res.status(200).json(
        new ApiResponse(
            200,
            { location, current: extractCurrent(oneCall), daily: extractDaily(oneCall) },
            "Hyperlocal location resolved"
        )
    );
});

// POST /  — save a resolved location against the logged-in user
const saveLocation = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { label, resolvedBy, village, block, district, state, pincode, lat, lon, isDefault } = req.body;

    if (!label || !resolvedBy || lat == null || lon == null) {
        throw new ApiError(400, "label, resolvedBy, lat and lon are required");
    }

    if (isDefault) {
        await Location.updateMany({ firebaseUID: uid }, { $set: { isDefault: false } });
    }

    const location = await Location.create({
        firebaseUID: uid,
        label,
        resolvedBy,
        village,
        block,
        district,
        state,
        pincode,
        lat,
        lon,
        isDefault: Boolean(isDefault),
    });

    return res.status(201).json(new ApiResponse(201, location, "Location saved"));
});

// GET /  — list this user's saved locations
const listSavedLocations = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;

    const locations = await Location.find({ firebaseUID: uid }).sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, locations, "Saved locations fetched"));
});

// PATCH /:id/default  — mark one saved location as the default
const setDefaultLocation = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { id } = req.params;

    const location = await Location.findOne({ _id: id, firebaseUID: uid });
    if (!location) throw new ApiError(404, "Saved location not found");

    await Location.updateMany({ firebaseUID: uid }, { $set: { isDefault: false } });
    location.isDefault = true;
    await location.save();

    return res.status(200).json(new ApiResponse(200, location, "Default location updated"));
});

// DELETE /:id
const deleteSavedLocation = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { id } = req.params;

    const location = await Location.findOneAndDelete({ _id: id, firebaseUID: uid });
    if (!location) throw new ApiError(404, "Saved location not found");

    return res.status(200).json(new ApiResponse(200, {}, "Saved location deleted"));
});

export { searchHyperlocal, saveLocation, listSavedLocations, setDefaultLocation, deleteSavedLocation };