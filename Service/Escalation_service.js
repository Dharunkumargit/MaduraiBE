// services/escalationService.js
import Bin from "../bins/Bin.schema.js";
import Employee from "../models/Employee_Schema.js";
import { sendWhatsAppAlert } from "../utils/whtasapp.js";
import { ROLE_CONTACTS } from "../config/constants.js";

class EscalationService {
   static async processBinEscalation(binId) {
  const bin = await Bin.findById(binId);
  if (!bin) return [];

  const rolesTriggered = [];

  const levels = [
    { level: "L1", after: 0, role: "Sanitary Inspector" },
    { level: "L2", after: 30, role: "Sanitary Officer" },
    { level: "L3", after: 60, role: "ACHO" },
    { level: "L4", after: 120, role: "Commissioner" },
  ];

  const minutesAt100 = bin.lastFullAt
    ? (new Date() - new Date(bin.lastFullAt)) / (1000 * 60)
    : 0;

  for (const rule of levels) {
    if (minutesAt100 >= rule.after) {
      if (!bin.escalations?.some(e => e.level === rule.level)) {

        // Save escalation
        bin.escalations = bin.escalations || [];
        bin.escalations.push({
          level: rule.level,
          time: new Date(),
        });

        // Send WhatsApp
        const contacts = ROLE_CONTACTS[rule.role] || [];

        for (const number of contacts) {
          await sendWhatsAppAlert({
            mobile: number,
            location: bin.location,
            ward: bin.ward,
            zone: bin.zone,
            fill: bin.filled,
            // imageUrl: bin.history?.[0]?.image_url || ""
          });
        }

        rolesTriggered.push(rule.role);
      }
    }
  }

  await bin.save();
  return rolesTriggered;
}

  // ===============================
  // TIME ESCALATION HANDLER
  // ===============================
  static async handleTimeEscalation(
    bin,
    minutes,
    level,
    threshold,
    role
  ) {
    if (
      minutes >= threshold &&
      !bin.escalation.timeEscalations.some((e) => e.level === level)
    ) {
      await this.notify(role, ROLE_CONTACTS[role], bin);

      bin.escalation.timeEscalations.push({
        level,
        role,
        minutes,
        time: new Date(),
      });

      bin.escalation.status = level;
      console.log(`🚨 ${bin.binid} escalated to ${role}`);
    }
  }

  // ===============================
  // NOTIFY METHOD
  // ===============================
  static async notify(role, phones, bin) {
  if (!phones) {
    console.log(`❌ No phone for ${role}`);
    return;
  }

  // Always convert to array
  const phoneList = Array.isArray(phones) ? phones : [phones];

  for (const phone of phoneList) {
    try {
      const cleanPhone = phone.toString().replace(/\D/g, "");

      console.log(`📤 Sending alert to ${role}: ${cleanPhone}`);

      const result = await sendWhatsAppAlert({
        mobile: cleanPhone,
        location: bin.location || "Unknown",
        ward: bin.ward?.toString() || "0",
        zone: bin.zone?.toString() || "0",
        fill: bin.filled?.toString(),
      });

      console.log(`✅ WhatsApp Success → ${cleanPhone}`, result);
    } catch (err) {
      console.error(`❌ Failed for ${phone}`, err.message);
    }
  }
}

static async getRoleEscalations(role) {
  const now = new Date();

  const bins = await Bin.find({ filled: { $gte: 100 } })
    .select("binid filled zone ward status escalation lastFullAt location mobile")
    .sort({ lastFullAt: -1 });

  const levelsOrder = ["L4", "L3", "L2", "L1"];

  const validBins = bins.filter(bin => {
    const timeEsc = bin.escalation?.timeEscalations || [];
    return timeEsc.length > 0;
  });

  const transformed = [];

  for (const bin of validBins) {
    const timeEsc = bin.escalation?.timeEscalations || [];

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

    
    // if (bin.mobile) {
    //   await sendWhatsAppAlert({
    //     mobile: "919342571277",
    //     location: bin.location || "Unknown",
    //     ward: bin.ward,
    //     zone: bin.zone,
    //     fill: bin.filled
    //   });
    // }

    transformed.push({
      binid: bin.binid,
      location: bin.location || `${bin.zone} / ${bin.ward}`,
      zone: bin.zone,
      ward: bin.ward,
      filled: bin.filled,
      currentLevel: highestLevel,
      minutesAt100,
      escalations: timeEsc,
    });
  }

  return {
    role,
    total: transformed.length,
    bins: transformed,
    timestamp: now,
  };
}

}

export default EscalationService;