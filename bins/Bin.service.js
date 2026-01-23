import Bin from "../bins/Bin.schema.js";
import axios from "axios";
import BinDailyData from "../bindailydata/bindaily.schema.js";
import { getLocationFromLatLong } from "../utils/getLocationFromLatLong.js";
import { createEscalation } from "../Service/Escalation_service.js";

// -------------------------
// Bin ID Generator
// -------------------------
let binCounter = 0;
const generateBinId = () => {
  binCounter += 1;
  return `MSB${String(binCounter).padStart(3, "0")}`;
};

// -------------------------
// Timestamp Parser
// -------------------------
const parseOutsourceTimestamp = (ts) => {
  if (!ts) return null;
  const fixed = ts.replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
  const date = new Date(fixed);
  return isNaN(date) ? null : date;
};

const getDummyOutsourceData = () => {
  const now = new Date();

  return [
    {
      bin_id: "MSB009",
      latest_1: {
        timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        fill_level: 80,
        image_url: "https://dummy.com/bin80.jpg",
      },
      latest_2: {
        timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        fill_level: 0,
        image_url: "https://dummy.com/bin100.jpg",
      },
    },
  ];
};
const latestBinStates = new Map();
// -------------------------
export const syncOutsourceBins = async () => {
  try {
    const { data } = await axios.get(
      "http://ec2-54-157-168-45.compute-1.amazonaws.com:8000/latest",
      { timeout: 10000 },
    );
    // const data = getDummyOutsourceData();
   
    const records = Array.isArray(data) ? data : [data];
    const now = new Date();

    for (const item of records) {
      const bin = await Bin.findOne({ binid: item.bin_id });
      if (!bin) continue;

      // Build history
      const history = Object.keys(item)
        .filter((k) => k.startsWith("latest_"))
        .map((k) => {
          const ts = parseOutsourceTimestamp(item[k]?.timestamp);
          if (!ts) return null;
          return {
            timestamp: ts,
            image_url: item[k].image_url,
            fill_level: Number(item[k].fill_level) || 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (!history.length) continue;

      const latest = history[0];
      const prevFill = bin.history?.[0]?.fill_level ?? bin.filled ?? 0;

      // -------------------------
      // FULL EVENT
      // -------------------------
      if (prevFill < 100 && latest.fill_level >= 100) {
        bin.clearedCount += 1;
        bin.lastFullAt = latest.timestamp;
        bin.totalClearedAmount = bin.clearedCount * bin.capacity;
      }

      // -------------------------
      // CLEARED EVENT
      // -------------------------
      if (prevFill >= 100 && latest.fill_level < 100) {
        bin.lastClearedAt = latest.timestamp;
        bin.lastCollectedAt = latest.timestamp;
        if (bin.lastFullAt) {
          const mins = (latest.timestamp - bin.lastFullAt) / (1000 * 60);

          // accumulate total time
          bin.totalClearTimeMins += mins;

          // true average = totalClearTime / clearedCount
          bin.avgClearTimeMins = Math.round(
            bin.totalClearTimeMins / bin.clearedCount,
          );

          // reset for next cycle
          bin.lastFullAt = null;
        }
      }

      // -------------------------
      // Update State
      // -------------------------
      bin.filled = latest.fill_level;
      bin.lastReportedAt = latest.timestamp;
      bin.history = history;

      const diffMins = (now - latest.timestamp) / (1000 * 60);

      if (latest.fill_level >= 100) bin.status = "Full";
      else if (diffMins > 30) bin.status = "Inactive";
      else bin.status = "Active";

      await bin.save();
       latestBinStates.set(bin.binid, {
        binid: bin.binid,
        zone: bin.zone,
        ward: bin.ward,
        fill_level: bin.filled,
        status: bin.status,
        clearedCount: bin.clearedCount,
        totalClearedAmount: bin.totalClearedAmount,
      });
    }

    // -------------------------
    // Global Inactive Check
    // -------------------------
    const bins = await Bin.find();
    for (const bin of bins) {
      if (!bin.lastReportedAt) continue;
      const diff = (now - bin.lastReportedAt) / (1000 * 60);
      if (diff > 30 && bin.status !== "Inactive") {
        bin.status = "Inactive";
        await bin.save();
      }
    }

    console.log("✅ Outsource sync completed");
  } catch (err) {
    console.error("❌ Outsource sync failed:", err.message);
  }
};

export const saveEndOfDayData = async () => {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (const state of latestBinStates.values()) {
      await BinDailyData.create({
        ...state,
        date: yesterday,
      });
    }

    console.log("✅ End-of-day bin data saved");
    latestBinStates.clear();
  } catch (err) {
    console.error("❌ Failed to save end-of-day data:", err.message);
  }
};


export const getAllBins = async (page, limit, skip) => {
  const now = new Date();

  const total = await Bin.countDocuments();

  const bins = await Bin.find()
    .sort({ })
    .skip(skip)
    .limit(limit);

  const formattedBins = bins.map((bin) => {
    const latest = bin.history?.[0];
    const lastTime = latest?.timestamp || bin.lastReportedAt;

    const diff = lastTime
      ? (now - new Date(lastTime)) / (1000 * 60)
      : Infinity;

    let status = bin.status;

    if ((latest?.fill_level ?? bin.filled) >= 100) {
      status = "Full";
    } else if (lastTime && diff > 30) {
      status = "Inactive";
    } else {
      status = "Active";
    }

    return {
      ...bin.toObject(),
      filled: latest?.fill_level ?? bin.filled,
      status,
      totalClearedAmount: (bin.clearedCount * bin.capacity) / 1000,
      lastReportedAt: lastTime,
    };
  });

  return { bins: formattedBins, total };
};


// -------------------------
// CRUD
// -------------------------
export const addBin = async (data) => {
  const binid = generateBinId();
  const geo = await getLocationFromLatLong(data.latitude, data.longitude);

  const bin = await Bin.create({
    ...data,
    binid,
    location: `${data.street}, ${geo}`,
  });

  await createEscalation({
    binid: bin.binid,
    zone: bin.zone,
    ward: bin.ward,
    engineer: "Not Assigned",
    escalationlevel: "Level 1",
  });

  return bin;
};

export const getBinById = (id) => Bin.findById(id);
export const deleteBin = (id) => Bin.findByIdAndDelete(id);

export const updateBinService = async (id, data) => {
  data.lastReportedAt = new Date();
  return Bin.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

// -------------------------
// Live Monitor
// -------------------------
let liveInterval;
export const startLiveMonitor = () => {
  if (!liveInterval) liveInterval = setInterval(syncOutsourceBins, 10000);
};

export const stopLiveMonitor = () => {
  clearInterval(liveInterval);
  liveInterval = null;
};
