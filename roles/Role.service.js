import RoleModel from "../roles/Role.schema.js";
import logger from "../config/logger.js";
import User from "../models/User_schema.js";

class RoleService {
  static async addRole(roleData) {
    try {
      return await RoleModel.create(roleData);
    } catch (error) {
      logger.error(`Error while adding role: ${error.message}`);
      throw error; // 🔥 IMPORTANT
    }
  }

  static async getRolesById(roleId) {
    try {
      const role = await RoleModel.findOne({ role_id: roleId });
      if (!role) throw new Error("Role not found");
      return role;
    } catch (error) {
      logger.error(`Error while getting role: ${error.message}`);
      throw error;
    }
  }

  static async getAllRoles() {
    try {
      return await RoleModel.find().sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Error while getting all roles: ${error.message}`);
      throw error;
    }
  }

  static async updateRole(role_id,updateData) {
    try {
      return await RoleModel.findOneAndUpdate(
        { role_id: role_id },
        { $set: updateData },
        { new: true }
      );

      
    } catch (error) {
      logger.error(`Error while updating role: ${error.message}`);
      throw error;
    }
  }

  static async deleteRoleByMongoId(id) {
    try {
      const deleted = await RoleModel.findByIdAndDelete(id);
      if (!deleted) {
        throw new Error("Role not found");
      }
      await User.updateMany(
        {  id },
        { $unset: { id: "" ,role:""} }
      );
      return deleted;
    } catch (error) {
      logger.error(`Error while deleting role: ${error.message}`);
      throw error;
    }
  }
}




export default RoleService;