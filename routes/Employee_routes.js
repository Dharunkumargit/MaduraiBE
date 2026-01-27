import express from "express";
import { createEmployee, deleteEmployee, getEmployees, getEmployeeWiseReport, updateEmployee } from "../controllers/Employee_controller.js";

const router = express.Router();


router.post("/createemployee", createEmployee);
router.get("/getemployees", getEmployees);
router.get("/employeereport", getEmployeeWiseReport);
router.delete("deleteemployee/:id",deleteEmployee)
router.put("/updateemployee/:id",updateEmployee);


export default router;