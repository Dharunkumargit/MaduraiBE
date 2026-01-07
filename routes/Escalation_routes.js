import express from "express";
import { getEscalations } from "../controllers/Escalation_controller.js";

const router = express.Router();

router.get("/getescalations", getEscalations);

export default router;