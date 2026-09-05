import { User } from "../models/user.model.js";
import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Called after client signs up with Firebase (frontend), sends ID token here
const registerUser = asyncHandler(async (req, res) => {
    const { uid, email } = req.firebaseUser;
    const { userName, fullName } = req.body;

    if (!userName || !fullName) {
        throw new ApiError(400, "userName and fullName required");
    }

    const existing = await User.findOne({ firebaseUID: uid });
    if (existing) {
        throw new ApiError(409, "User already registered");
    }

    const user = await User.create({
        firebaseUID: uid,
        email,
        userName,
        fullName,
        isVerified: req.firebaseUser.email_verified || false,
    });

    return res.status(201).json(new ApiResponse(201, user, "User registered"));
});

// Called on login — syncs/fetches Mongo profile matching Firebase identity
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findOne({ firebaseUID: req.firebaseUser.uid });

    if (!user) {
        throw new ApiError(404, "User profile not found in DB");
    }

    return res.status(200).json(new ApiResponse(200, user, "Current user fetched"));
});

// TODO: sync/login user after Firebase auth on frontend
const loginUser = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: logout — revoke Firebase refresh tokens / clear session
const logoutUser = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: refresh Firebase ID token
const refreshToken = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: update user profile fields (fullName, userName, etc.)
const updateProfile = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: change password via Firebase Admin
const changePassword = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: send forgot-password reset link via Firebase
const forgotPassword = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: reset password using reset token/code
const resetPassword = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: verify email via Firebase verification link/token
const verifyEmail = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: resend email verification link
const resendVerificationEmail = asyncHandler(async (req, res) => {
    // impl later
});

// TODO: delete user account (Firebase + Mongo)
const deleteAccount = asyncHandler(async (req, res) => {
    // impl later
});

export {
    registerUser,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshToken,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    deleteAccount,
};