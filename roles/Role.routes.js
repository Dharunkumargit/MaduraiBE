import express from "express";
import { createRole, deleteRoleById, getAllRoles, getRoleById,  updateRoleById } from "../roles/Role.controller.js";


const router = express.Router();

router.post("/addrole", createRole);
router.get("/getroles", getAllRoles);
router.get("/getrolebyid", getRoleById);
router.put("/updaterolebyid", updateRoleById);
router.delete("/deleterolebyid/:id", deleteRoleById);


export default router;