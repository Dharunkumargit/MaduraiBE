import express from "express";
import { getBinsByDateController, getBinsByMonthController } from "./bindaily.controller.js";

const router = express.Router();

// Daily snapshot by specific date
router.get("/filter", getBinsByDateController);

// Monthly snapshot
router.get("/monthly", getBinsByMonthController);

export default router;
