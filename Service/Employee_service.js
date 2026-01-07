import Employee from "../models/Employee_Schema.js";

export const createEmployee = async (data) => {
  const exists = await Employee.findOne({   phonenumber: data.phonenumber });
  if (exists) throw new Error("Phone number already exists!");

  return await Employee.create(data);
};

export const getEmployees = async () => {
  return await Employee.find().sort({ createdAt: -1 });
};

export const generateEmployeeWiseReport = async (fromDate, toDate) => {
  const filter = {};

  if (fromDate && toDate) {
    filter.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    };
  }

  const employees = await Employee.find(filter);

  return employees.map((emp) => {
    // 🔹 TEMP LOGIC (replace with real logic later)
    const taskassigned = Math.floor(Math.random() * 20) + 5;
    const taskcompleted = Math.floor(taskassigned * 0.8);
    const averagecleaningtime = Math.floor(Math.random() * 30) + 15;
    const escalations = Math.floor(Math.random() * 5);
    const garbage = Math.floor(Math.random() * 10) + 1;

    const compliance = Math.round(
      (taskcompleted / taskassigned) * 100
    ); 

    return {
      employeename: emp.name,
      assignedzone: emp.zone || emp.ward || "N/A",
      taskassigned,
      taskcompleted,
      averagecleaningtime: `${averagecleaningtime} mins`,
      compliance: `${compliance}%`,
      escalations,
      garbage: `${garbage} Tons`
    };
  });
};

export const deleteEmployee = async (id) => {
  const employee = await Employee.findById(id);

  if (!employee) {
    throw new Error("Employee not found");
  }

  await Employee.findByIdAndDelete(id);

  return employee;
};