import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import {
    searchHyperlocal,
    saveLocation,
    listSavedLocations,
    setDefaultLocation,
    deleteSavedLocation,
} from "../controllers/location.controller.js";

const router = Router();

// public — hyperlocal lookup doesn't require login
router.get("/search", searchHyperlocal);

// protected — saved locations are per-user
router.post("/", verifyFirebaseToken, saveLocation);
router.get("/", verifyFirebaseToken, listSavedLocations);
router.patch("/:id/default", verifyFirebaseToken, setDefaultLocation);
router.delete("/:id", verifyFirebaseToken, deleteSavedLocation);

export default router;