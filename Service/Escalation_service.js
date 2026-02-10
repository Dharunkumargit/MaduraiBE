// services/escalationService.js
import Bin from "../bins/Bin.schema.js";
import Employee from "../models/Employee_Schema.js";
import WhatsappService from "../utils/whtasapp.js";

class EscalationService {
  // =================================================
  // MAIN ESCALATION HANDLER - FIXED TIMING LOGIC
  // =================================================
  static async processBinEscalation(binId) {
    const bin = await Bin.findById(binId);
    if (!bin) return [];

    const fillLevel = bin.filled;

    const now = new Date();
    let rolesToNotify = [];

    console.log(`🔍 ${bin.binid} → ${fillLevel}%`);

    // Init escalation object
    bin.escalation ||= {};
    bin.escalation.thresholdsHit ||= {};
    bin.escalation.timeEscalations ||= [];

    // =================================================
    // RESET WHEN CLEARED (<50%)
    // =================================================
    if (fillLevel < 50) {
      bin.escalation = {
        thresholdsHit: {},
        timeEscalations: [],
        status: "normal",
      };

      bin.lastFullAt = null;

      bin.markModified("escalation");
      await bin.save();

      console.log(`🧹 Bin ${bin.binid} escalation cleared`);
      return [];
    }

    // =================================================
    // 75% → Ward Supervisor (ONCE)
    // =================================================
    if (fillLevel >= 75 && !bin.escalation.thresholdsHit["75%"]) {
      const zone = Array.isArray(bin.zone) ? bin.zone[0] : bin.zone;
      const ward = Array.isArray(bin.ward) ? bin.ward[0] : bin.ward;

      const supervisor = await Employee.findOne({
        role_name: /Ward Supervisor/i,
        zone: new RegExp(zone, "i"),
        ward: new RegExp(ward, "i"),
      });

      if (supervisor) {
        await this.sendWhatsApp(supervisor.phonenumber, {
          message: `🚨 Bin ${bin.binid} reached 75% (${zone}-${ward})`,
        });

        bin.escalation.thresholdsHit["75%"] = {
          time: now,
          notified: [supervisor.name],
        };

        bin.escalation.status = "75%";
        rolesToNotify.push("Ward Supervisor");
        await bin.save();
      }
    }

    // =================================================
    // 90% → Sanitary Inspector (ONCE)
    // =================================================
    if (fillLevel >= 90 && !bin.escalation.thresholdsHit["90%"]) {
      await this.sendWhatsApp("SI_PHONE", {
        message: `🚨 Bin ${bin.binid} reached 90%`,
      });

      bin.escalation.thresholdsHit["90%"] = {
        time: now,
        notified: ["Sanitary Inspector"],
      };

      bin.escalation.status = "90%";
      rolesToNotify.push("Sanitary Inspector");
      await bin.save();
    }

    // =================================================
    // 🔴 100% → IMMEDIATE ALERT (ONCE ONLY)
    // =================================================
    if (fillLevel >= 100 && !bin.escalation.thresholdsHit["100%"]) {
      console.log("🚨 100% reached → Initial alert");

      await this.sendWhatsApp("SANITARY_OFFICER_PHONE", {
        message: `🚨 Bin ${bin.binid} reached 100%`,
      });

      bin.escalation.thresholdsHit["100%"] = {
        time: now,
        notified: ["Sanitary Officer"],
      };

      bin.escalation.status = "100%";
      bin.lastFullAt = now; // ⏱ START TIMER HERE

      await bin.save();

      // ⛔ STOP HERE → NO L1 IN SAME CYCLE
      return ["Sanitary Officer"];
    }

    // 🔥 🔥 FIXED: ONLY CHECK TIME ESCALATIONS AFTER 100% + lastFullAt EXISTS
    // =================================================
    if (fillLevel >= 100 && bin.lastFullAt) {
      const lastFullDate = new Date(bin.lastFullAt); // ✅ Fix #1: Single conversion
      const nowDate = new Date(); // ✅ Fix #2: Explicit now
      const minutesAt100 = Math.floor((nowDate - lastFullDate) / (1000 * 60));

      console.log(
        `⏱ ${bin.binid} full for ${minutesAt100} mins (${lastFullDate.toLocaleTimeString("en-IN")})`,
      );

      // -------- L1 (21 mins) --------
      if (
        minutesAt100 >= 21 &&
        !bin.escalation.timeEscalations.some((e) => e.level === "L1")
      ) {
        await this.sendWhatsApp("ACHO_PHONE", {
          message: `🚨 Bin ${bin.binid} is FULL for ${minutesAt100} mins`,
        });

        bin.escalation.timeEscalations.push({
          level: "L1",
          role: "ACHO",
          minutes: minutesAt100,
          time: now,
        });

        bin.escalation.status = "L1";
        bin.markModified("escalation");
        rolesToNotify.push("ACHO");
        await bin.save();
      }

      // -------- L2 (31 mins) --------
      if (
        minutesAt100 >= 31 &&
        !bin.escalation.timeEscalations.some((e) => e.level === "L2")
      ) {
        bin.escalation.timeEscalations.push({
          level: "L2",
          role: "CHO",
          minutes: minutesAt100,
          time: now,
        });

        bin.escalation.status = "L2";
        rolesToNotify.push("CHO");
        await bin.save();
      }

      // -------- L3 (51 mins) --------
      if (
        minutesAt100 >= 51 &&
        !bin.escalation.timeEscalations.some((e) => e.level === "L3")
      ) {
        bin.escalation.timeEscalations.push({
          level: "L3",
          role: "Deputy Commissioner",
          minutes: minutesAt100,
          time: now,
        });

        bin.escalation.status = "L3";
        rolesToNotify.push("Deputy Commissioner");
        await bin.save();
      }

      // -------- L4 (61 mins) --------
      if (
        minutesAt100 >= 61 &&
        !bin.escalation.timeEscalations.some((e) => e.level === "L4")
      ) {
        bin.escalation.timeEscalations.push({
          level: "L4",
          role: "Commissioner",
          minutes: minutesAt100,
          time: now,
        });

        bin.escalation.status = "L4";
        rolesToNotify.push("Commissioner");
        await bin.save();
      }
    }

    return rolesToNotify;
  }

  // =================================================
  // MOCK WHATSAPP
  // =================================================
  static async sendWhatsApp(phone, data) {
  return WhatsAppService.sendMessage({
    mobile: phone,
    templateId: "bill_reminder",   // 🔥 Your KWIC template
    variables: {
      days: data.days || "0",
      amount: data.amount || "N/A",
      due_date: data.due_date || new Date().toLocaleDateString("en-IN"),
    },
  });
}

static async getRoleEscalations(role) {
  const now = new Date();

  // Only 100% full bins
  const bins = await Bin.find({ filled: { $gte: 100 } })
    .select("binid filled zone ward status escalation lastFullAt location")
    .sort({ lastFullAt: -1 });

  const levelsOrder = ["L4", "L3", "L2", "L1"];

  // ✅ FILTER OUT bins with ZERO escalations BEFORE mapping
  const validBins = bins.filter(bin => {
    const timeEsc = bin.escalation?.timeEscalations || [];
    return timeEsc.length > 0;  // Only bins WITH escalations
  });

  const transformed = validBins.map((bin) => {
    const timeEsc = bin.escalation?.timeEscalations || [];

    // ✅ Your new logic - perfect!
    let highestLevel = "Wait for escalation";
    for (const lvl of levelsOrder) {
      if (timeEsc.some((e) => e.level === lvl)) {
        highestLevel = lvl;
        break;
      }
    }

    const minutesAt100 = bin.lastFullAt
      ? Math.floor((now - new Date(bin.lastFullAt)) / (1000 * 60))
      : 0;

    const roleVisibleLevels = {
      ACHO: ["L1", "L2", "L3", "L4"],
      CHO: ["L2", "L3", "L4"],
      "Deputy Commissioner": ["L3", "L4"],
      Commissioner: ["L4"],
      Admin: ["L1", "L2", "L3", "L4"],
    };
    const visibleLevels = roleVisibleLevels[role] || ["L1"];

    const visibleEscalations = timeEsc.filter((e) =>
      visibleLevels.includes(e.level),
    );

    return {
      binid: bin.binid,
      location: bin.location || `${bin.zone} / ${bin.ward}`,
      zone: bin.zone,
      ward: bin.ward,
      filled: bin.filled,
      currentLevel: highestLevel,
      minutesAt100,
      escalations: visibleEscalations,
    };
  });

  return {
    role,
    total: transformed.length,
    bins: transformed,
    timestamp: now,
  };
}

}

export default EscalationService;