import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    
    emp_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    
    phonenumber: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    designation: { type: String, required: true },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);
const Employee = mongoose.model("Employee", EmployeeSchema);
export default Employee;