import * as BinService from "../bins/Bin.service.js";

export const createBin = async (req, res) => {
  try {
    const {
      zone,
      ward,
      street,
      latitude,
      longitude,
      bintype,
      capacity,
    } = req.body;

    if (
      !zone ||
      !ward ||
      !street ||
      !latitude ||
      !longitude ||
      !bintype ||
      !capacity 
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const bin = await BinService.addBin(req.body);

    res.status(201).json({
      success: true,
      message: "Bin created successfully",
      data: bin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBins = async (req, res) => {
  const bins = await BinService.getAllBins();
  res.json({ success: true, total: bins.length, data: bins });
};

export const getBin = async (req, res) => {
  const bin = await BinService.getBinById(req.params.id);
  if (!bin) return res.status(404).json({ message: "Bin not found" });
  res.json({ success: true, data: bin });
};

export const updateBin = async (req, res) => {
  try {
    const bin = await BinService.updateBinService(
      req.params.id,
      req.body
    );

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: "Bin not found",
      });
    }

    res.json({
      success: true,
      message: "Bin updated successfully",
      data: bin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBin = async (req, res) => {
  await BinService.deleteBin(req.params.id);
  res.json({ success: true, message: "Bin deleted successfully" });
};

export const getBinReport = async (req, res) => {
  try {
    const report = await BinService.getBinReport();
    res.json({ success: true, total: report.length, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};