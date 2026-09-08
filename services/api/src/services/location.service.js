import { ApiError } from "../utils/Async.js";
import { geocodeByCity, geocodeByPincode } from "./weather.service.js";

const POSTAL_BASE = "https://api.postalpincode.in";

// PIN code -> { village, block, district, state } (labels only, no coordinates)
const lookupPincodeDetails = async (pincode) => {
    const res = await fetch(`${POSTAL_BASE}/pincode/${pincode}`);
    const data = await res.json();

    const record = data?.[0];
    if (!record || record.Status !== "Success" || !record.PostOffice?.length) {
        throw new ApiError(404, `No details found for pincode "${pincode}"`);
    }

    const office = record.PostOffice[0];
    return {
        village: office.Name,
        block: office.Block,
        district: office.District,
        state: office.State,
    };
};

// PIN code -> full hyperlocal location (labels + coordinates)
const resolveByPincode = async (pincode) => {
    const [details, coords] = await Promise.all([
        lookupPincodeDetails(pincode),
        geocodeByPincode(pincode, "IN"),
    ]);

    return {
        resolvedBy: "pincode",
        pincode,
        ...details,
        lat: coords.lat,
        lon: coords.lon,
    };
};

// Village/post-office name -> best-matching hyperlocal location
const resolveByVillage = async (villageName) => {
    const res = await fetch(`${POSTAL_BASE}/postoffice/${encodeURIComponent(villageName)}`);
    const data = await res.json();

    const record = data?.[0];
    if (!record || record.Status !== "Success" || !record.PostOffice?.length) {
        throw new ApiError(404, `No village found matching "${villageName}"`);
    }

    const office = record.PostOffice[0];

    // Postal API has no coordinates — geocode the district as the best available anchor point
    const coords = await geocodeByCity(`${office.District}`, "IN");

    return {
        resolvedBy: "village",
        village: office.Name,
        block: office.Block,
        district: office.District,
        state: office.State,
        pincode: office.Pincode,
        lat: coords.lat,
        lon: coords.lon,
    };
};

// District (optionally scoped by state) -> block/district-level location
const resolveByDistrict = async (district, state) => {
    const query = state ? `${district}, ${state}` : district;
    const coords = await geocodeByCity(query, "IN");

    return {
        resolvedBy: "district",
        district,
        state: state || null,
        lat: coords.lat,
        lon: coords.lon,
    };
};

export { resolveByPincode, resolveByVillage, resolveByDistrict, lookupPincodeDetails };