import logger from "../config/logger.js";
import IdcodeServices from "../idcode/idcode.service.js";
import RoleService from "../roles/Role.service.js";


export const createRole = async (req, res) => {
  try {
    const { role_name, accessLevels, status, created_by_user } = req.body;

    if (!role_name) {
      return res.status(400).json({ message: "Role name required" });
    }
    const cleanAccessLevels = accessLevels.map(a => ({
      feature: a.feature,
      permissions: a.permissions.filter(p => p !== "All")
    }));
    if (!accessLevels || accessLevels.length === 0) {
      return res.status(400).json({ message: "Access levels required" });
    }

    const role_id = await IdcodeServices.generateCode("RoleAccess");
    if (!role_id) throw new Error("Failed to generate role ID");

    const role = await RoleService.addRole({
      role_id,
      role_name,
      accessLevels: cleanAccessLevels,
      status,
      created_by_user,
    });

    res.status(201).json({
      status: true,
      message: "Role Acces level created successfully",
      data: role,
    });
  } catch (error) {
    logger.error(`Error creating role Acces level: ${error.message}`);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.query;
    const role = await RoleService.getRolesById(roleId);

    res.status(200).json({
      status: true,
      data: role,
    });
  } catch (error) {
    logger.error(`Error getting role: ${error.message}`);
    res.status(404).json({ message: error.message });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const roles = await RoleService.getAllRoles();
    res.status(200).json({
      status: true,
      data: roles,
    });
  } catch (error) {
    logger.error(`Error getting all roles: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const updateRoleById = async (req, res) => {
    const { roleId } = req.query;
    try {
      const update = req.body;
      const updated = await RoleService.updateRole(roleId, update);
      res.status(200).json({
        status: true,
        message: "Role updated successfully",
        data: updated,
      });
    } catch (error) {
      logger.error(`Error updating role: ${error.message}`);
      res.status(500).json({ message: "Error updating role" + error });
    }
  };
export const deleteRoleById = async (req, res) => {
    try {
      const { id } = req.params;   
  
      const deleted = await RoleService.deleteRoleByMongoId(id);
  
      if (!deleted) {
        return res.status(404).json({
          status: false,
          message: "Role not found",
        });
      }
  
      res.status(200).json({
        status: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      logger.error(`Error deleting role: ${error.message}`);
      res.status(404).json({
        status: false,
        message: error.message,
      });
    }
  };