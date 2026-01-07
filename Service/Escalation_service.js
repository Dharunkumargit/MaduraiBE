import Escalation from "../models/Escalation_Schema.js";

export const createEscalation = async (data) => {
  return await Escalation.create(data);
};

export const getAllEscalations = async () => {
  return await Escalation.find();
};