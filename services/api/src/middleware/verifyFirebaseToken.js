import adminAuth from "../config/firebase.js";
import { ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "No token provided");
    }

    const idToken = authHeader.split(" ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid or expired token");
    }
});

export { verifyFirebaseToken };