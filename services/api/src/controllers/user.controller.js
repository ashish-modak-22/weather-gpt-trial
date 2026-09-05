import { User } from "../models/user.model.js";
import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import adminAuth from "../config/firebase.js";

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

// Sync/login user after Firebase auth on frontend
const loginUser = asyncHandler(async (req, res) => {
    const { uid, email_verified } = req.firebaseUser;

    const user = await User.findOne({ firebaseUID: uid });

    if (!user) {
        throw new ApiError(404, "User profile not found, please register first");
    }

    if (user.isVerified !== Boolean(email_verified)) {
        user.isVerified = email_verified || false;
        await user.save();
    }

    return res.status(200).json(new ApiResponse(200, user, "Login successful"));
});

// Logout — revoke Firebase refresh tokens / clear session
const logoutUser = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;

    await adminAuth.revokeRefreshTokens(uid);

    return res.status(200).json(new ApiResponse(200, {}, "User logged out"));
});

// Refresh Firebase ID token using the Secure Token API
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: incomingRefreshToken } = req.body;

    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "refresh_token",
                refresh_token: incomingRefreshToken,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(401, data.error?.message || "Invalid or expired refresh token");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                idToken: data.id_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
            },
            "Token refreshed"
        )
    );
});

// Update user profile fields (fullName, userName, etc.)
const updateProfile = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { userName, fullName } = req.body;

    if (!userName && !fullName) {
        throw new ApiError(400, "At least one of userName or fullName is required");
    }

    const updates = {};
    if (userName) updates.userName = userName;
    if (fullName) updates.fullName = fullName;

    const user = await User.findOneAndUpdate(
        { firebaseUID: uid },
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError(404, "User profile not found");
    }

    return res.status(200).json(new ApiResponse(200, user, "Profile updated"));
});

// Change password via Firebase Admin
const changePassword = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        throw new ApiError(400, "newPassword must be at least 6 characters");
    }

    await adminAuth.updateUser(uid, { password: newPassword });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Send forgot-password reset link via Firebase
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const resetLink = await adminAuth.generatePasswordResetLink(email);

    // TODO: wire this up to an actual email service (e.g. nodemailer) instead of logging
    console.log("Password reset link:", resetLink);

    return res.status(200).json(new ApiResponse(200, {}, "Password reset link sent to email"));
});

// Reset password using reset token/code
const resetPassword = asyncHandler(async (req, res) => {
    const { oobCode, newPassword } = req.body;

    if (!oobCode || !newPassword) {
        throw new ApiError(400, "oobCode and newPassword are required");
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${process.env.FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oobCode, newPassword }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(400, data.error?.message || "Invalid or expired reset code");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successful"));
});

// Verify email via Firebase verification link/token
const verifyEmail = asyncHandler(async (req, res) => {
    const { oobCode } = req.body;

    if (!oobCode) {
        throw new ApiError(400, "oobCode is required");
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oobCode }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(400, data.error?.message || "Invalid or expired verification code");
    }

    await User.findOneAndUpdate({ email: data.email }, { $set: { isVerified: true } });

    return res.status(200).json(new ApiResponse(200, {}, "Email verified successfully"));
});

// Resend email verification link
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.firebaseUser;

    const verificationLink = await adminAuth.generateEmailVerificationLink(email);

    // TODO: wire this up to an actual email service (e.g. nodemailer) instead of logging
    console.log("Email verification link:", verificationLink);

    return res.status(200).json(new ApiResponse(200, {}, "Verification email sent"));
});

// Delete user account (Firebase + Mongo)
const deleteAccount = asyncHandler(async (req, res) => {
    const { uid } = req.firebaseUser;

    const user = await User.findOneAndDelete({ firebaseUID: uid });

    if (!user) {
        throw new ApiError(404, "User profile not found");
    }

    await adminAuth.deleteUser(uid);

    return res.status(200).json(new ApiResponse(200, {}, "Account deleted successfully"));
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