import * as EmployeeService from "../Service/Employee_service.js";

export const createEmployee = async (req, res) => {
  try {
    const newEmp = await EmployeeService.createEmployee(req.body);
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: newEmp,
    });
  } catch (error) {
    console.error("Create Employee Error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

  
  export const loginEmployee = async (req, res, next) => {
    try {
      const data = await EmployeeService.loginemployee(req.body);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data,
      });
    } catch (error) {
      next(error);
    }
  };
  
  export const getEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const { employees, totalItems } =
      await EmployeeService.getEmployees({ skip, limit });

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        totalItems,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

  

 

export const getEmployeeWiseReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const report = await EmployeeService.generateEmployeeWiseReport(fromDate, toDate);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error("Employee-wise report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate employee-wise report"
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEmp = await EmployeeService.updateEmployee(id, req.body);
    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmp,
    });
  } catch (error) {
    console.error("Update Employee Error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEmp = await EmployeeService.deleteEmployee(id);

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
      data: deletedEmp,
    });
  } catch (error) {
    console.error("Delete Employee Error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};