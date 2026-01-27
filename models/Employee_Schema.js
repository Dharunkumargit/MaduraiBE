import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    emp_id: { type: String },
    name: { type: String, required: true },

    phonenumber: { type: String, required: true, unique: true },
    emailid: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    designation: { type: String, required: true },
    status: { type: String, default: "Active" },
    zone: [{ type: String, default: [] }],
    ward: [{ type: String, default: [] }],
    role_name: { type: String, default: "" },
    role_id: { type: String, default: "" },
    password: { type: String },
  },
  { timestamps: true },
);
const Employee = mongoose.model("Employee", EmployeeSchema);
export default Employee;
