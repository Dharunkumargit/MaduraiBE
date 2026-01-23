import Employee from "../models/Employee_Schema.js";
import IdcodeServices from "../idcode/idcode.service.js";

export const createEmployee = async (data) => {
  
  const exists = await Employee.findOne({ phonenumber: data.phonenumber },{emailid: data.emailid});
  if (exists) throw new Error("Phone number already exists!");

  
  const emp_id = await IdcodeServices.generateCode("EMPLOYEE");

  if (!emp_id) {
    throw new Error("Failed to generate employee ID");
  }

  
  data.emp_id = emp_id; 

  return await Employee.create(data);
};

export const getEmployees = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const totalItems = await Employee.countDocuments();

  const employees = await Employee.find()
    .sort({  })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    employees,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      itemsPerPage: limit,
    },
  };
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

export const updateEmployee = async (id, data) => {
  // Find the employee
  const employee = await Employee.findById(id);
  if (!employee) throw new Error("Employee not found");

  // Check if new phone/email already exists for another employee
  if (data.phonenumber && data.phonenumber !== employee.phonenumber) {
    const phoneExists = await Employee.findOne({ phonenumber: data.phonenumber });
    if (phoneExists) throw new Error("Phone number already exists!");
  }

  if (data.emailid && data.emailid !== employee.emailid) {
    const emailExists = await Employee.findOne({ emailid: data.emailid });
    if (emailExists) throw new Error("Email already exists!");
  }

  // Update the employee
  Object.assign(employee, data);

  await employee.save();
  return employee;
};

export const deleteEmployee = async (id) => {
  const employee = await Employee.findByIdAndDelete(id);

  if (!employee) {
    throw new Error("Employee not found");
  }

  

  return employee;
};