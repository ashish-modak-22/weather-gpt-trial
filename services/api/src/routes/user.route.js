import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import {
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
} from "../controllers/user.controller.js";

const router = Router();

// public
router.post("/register", verifyFirebaseToken, registerUser);
router.post("/login", verifyFirebaseToken, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", verifyFirebaseToken, resendVerificationEmail);

// protected
router.get("/me", verifyFirebaseToken, getCurrentUser);
router.post("/logout", verifyFirebaseToken, logoutUser);
router.patch("/update-profile", verifyFirebaseToken, updateProfile);
router.patch("/change-password", verifyFirebaseToken, changePassword);
router.delete("/delete-account", verifyFirebaseToken, deleteAccount);

export default router;