// services/escalationService.js - PRODUCTION READY + LOCATION WHATSAPP
import Bin from "../bins/Bin.schema.js";
import Employee from "../models/Employee_Schema.js"; // Add this import

class EscalationService {
  static async processBinEscalation(binId) {
    const bin = await Bin.findById(binId);
    if (!bin) return [];

    const fillLevel = bin.filled;
    const now = new Date();
    let rolesToNotify = [];
    
    console.log(`🔍 ${bin.binid}: ${fillLevel}%`);

    // Initialize escalation object
    bin.escalation = bin.escalation || {};
    bin.escalation.thresholdsHit = bin.escalation.thresholdsHit || {};

 // ================================
// 75% → FORCE ALERT (DISABLED LOGIC)
// ================================
if (fillLevel >= 75) {
  console.log('🔥 75% THRESHOLD HIT - CHECKING SUPERVISOR...');
  
  // ✅ DEBUG: Log bin zone/ward data
  const zone = Array.isArray(bin.zone) ? bin.zone[0] : bin.zone || '';
  const ward = Array.isArray(bin.ward) ? bin.ward[0] : bin.ward || '';
  const zoneNum = zone.replace(/Zone\s*/i, '').trim();
  const cleanWard = ward.replace(/ ward/i, '').trim();
  
  console.log(`📍 Zone: "${zoneNum}", Ward: "${cleanWard}"`);
  
  // ✅ Find Ward Supervisor
  const wardSupervisor = await Employee.findOne({
    role_name: { $regex: 'Ward Supervisor', $options: 'i' }, // Case insensitive
    zone: { $regex: zoneNum, $options: 'i' },
    ward: { $regex: cleanWard, $options: 'i' }
  }).select('name phonenumber zone ward');
  
  console.log(`🎯 Supervisor found:`, wardSupervisor ? `${wardSupervisor.name}` : 'NONE');
  
  if (wardSupervisor) {
    console.log(`✅ 75% → ${wardSupervisor.name} (${wardSupervisor.phonenumber})`);
    
    await this.sendWhatsApp(wardSupervisor.phonenumber, {
      binId: bin.binid,
      zone: zoneNum,
      ward: cleanWard,
      fillLevel,
      message: `🚨 Bin ${bin.binid} (${zoneNum}-${cleanWard}) reached ${fillLevel}%`
    });
    
    bin.escalation = bin.escalation || {};
    bin.escalation.thresholdsHit = bin.escalation.thresholdsHit || {};
    bin.escalation.thresholdsHit['75%'] = {
      time: now,
      notified: [wardSupervisor.name],
      phone: wardSupervisor.phonenumber,
      zone: zoneNum,
      ward: cleanWard
    };
    rolesToNotify.push(wardSupervisor.name);
  } else {
    console.log(`❌ NO Ward Supervisor for Zone${zoneNum} ${cleanWard}`);
    rolesToNotify.push('Ward Supervisor (Not Found)');
  }
  
  bin.escalation.status = '75%';
  await bin.save();
}


    // ================================
    // 90% → Sanitary Inspectors (unchanged)
    // ================================
    const already90 = bin.escalation.thresholdsHit['90%']?.notified?.length > 0;
    if (fillLevel >= 90 && !already90) {
      console.log('✅ 90% → Sanitary Inspectors');
      bin.escalation.thresholdsHit['90%'] = {
        time: now,
        notified: ['SI - Sanitary Inspectors']
      };
      bin.escalation.status = '90%';
      rolesToNotify.push('SI - Sanitary Inspectors');
      await bin.save();
    }

    // ================================
    // 100% → Full Alert (unchanged)
    // ================================
    const already100 = bin.escalation.thresholdsHit['100%']?.notified?.length > 0;
    if (fillLevel >= 100 && !already100) {
      console.log('✅ 100% → Full Alert');
      bin.escalation.thresholdsHit['100%'] = {
        time: now,
        notified: ['Full Alert Team']
      };
      bin.escalation.status = '100%';
      rolesToNotify.push('Full Alert Team');
      await bin.save();
    }

    // ================================
    // TIME-BASED ESCALATIONS (unchanged)
    // ================================
    if (fillLevel >= 100 && bin.lastFullAt) {
      const fullMins = (now - new Date(bin.lastFullAt)) / (1000 * 60);
      bin.escalation.timeEscalations = bin.escalation.timeEscalations || [];

      // L1: 21+ mins → ACHO (unchanged)
      if (fullMins >= 21 && !bin.escalation.timeEscalations.some(e => e.level === 'L1')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → ACHO - L1`);
        bin.escalation.timeEscalations.push({
          level: 'L1', role: 'ACHO', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L1';
        rolesToNotify.push('ACHO - L1');
        await bin.save();
      }

      // L2, L3, L4 (unchanged - your original logic)
      if (fullMins >= 31 && !bin.escalation.timeEscalations.some(e => e.level === 'L2')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → CHO - L2`);
        bin.escalation.timeEscalations.push({
          level: 'L2', role: 'CHO', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L2';
        rolesToNotify.push('CHO - L2');
        await bin.save();
      }

      if (fullMins >= 51 && !bin.escalation.timeEscalations.some(e => e.level === 'L3')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → Deputy Commissioner - L3`);
        bin.escalation.timeEscalations.push({
          level: 'L3', role: 'Deputy Commissioner', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L3';
        rolesToNotify.push('Deputy Commissioner - L3');
        await bin.save();
      }

      if (fullMins >= 61 && !bin.escalation.timeEscalations.some(e => e.level === 'L4')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → Commissioner - L4`);
        bin.escalation.timeEscalations.push({
          level: 'L4', role: 'Commissioner', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L4';
        rolesToNotify.push('Commissioner - L4');
        await bin.save();
      }
    }

    return rolesToNotify;
  }

  // ✅ WHATSAPP SENDER (Add this method)
  static async sendWhatsApp(phoneNumber, data) {
    try {
      console.log(`📱 WhatsApp → ${phoneNumber}: ${data.message}`);
      
      // TODO: Replace with your WhatsApp API (Twilio/Gupshup)
      // await whatsappClient.messages.create({
      //   from: 'whatsapp:+1234567890',
      //   to: `whatsapp:${phoneNumber}`,
      //   body: data.message
      // });
      
      return true;
    } catch (error) {
      console.error('❌ WhatsApp Error:', error.message);
      return false;
    }
  }

  // ✅ Keep your existing getRoleEscalations() unchanged
  static async getRoleEscalations(role) {
    const roleConfig = {
      'Ward Supervisor': { type: 'fill', minFill: 75, maxFill: 89, threshold: '75%', level: '75%' },
      'SI - Sanitary Inspectors': { type: 'fill', minFill: 90, maxFill: 99, threshold: '90%', level: '90%' },
      'Sanitary Office': { type: 'fill', minFill: 100, maxFill: 100, threshold: '100%', level: '100%' },
      'ACHO': { type: 'time', level: 'L1', displayLevel: 'L1 (21+ mins)' },
      'CHO': { type: 'time', level: 'L2', displayLevel: 'L2 (31+ mins)' },
      'Deputy Commissioner': { type: 'time', level: 'L3', displayLevel: 'L3 (51+ mins)' },
      'Commissioner': { type: 'time', level: 'L4', displayLevel: 'L4 (61+ mins)' }
    };

    const config = roleConfig[role];
    if (!config) throw new Error(`Role ${role} not configured`);

    let query = {};
    
    if (config.type === 'time') {
      query = {
        'escalation.timeEscalations': {
          $elemMatch: { level: config.level, role: role }
        }
      };
    } else {
      query = {
        [`escalation.thresholdsHit.${config.threshold}`]: { $exists: true },
        filled: { $gte: config.minFill, $lte: config.maxFill }
      };
    }

    console.log(`🔍 ${role} query:`, JSON.stringify(query));

    const bins = await Bin.find(query)
      .select('binid filled zone ward street status escalation')
      .sort({ filled: -1 });

    

    const transformedBins = bins.map(bin => {
  const roleEscalation =
    config.type === 'time'
      ? bin.escalation.timeEscalations?.find(e => e.level === config.level)
      : bin.escalation.thresholdsHit?.[config.threshold];

  return {
    binid: bin.binid,

    // ✅ normalize arrays → string
    zone: Array.isArray(bin.zone) ? bin.zone.join(', ') : bin.zone,
    ward: Array.isArray(bin.ward) ? bin.ward.join(', ') : bin.ward,

    // ✅ LOCATION FIX
    street: bin.street ,

    filled: bin.filled,
    status: bin.status,

    escalatedAt: roleEscalation?.time,
    notified: roleEscalation?.notified || [role],
    priority: bin.filled >= 90 ? 'HIGH' : 'MEDIUM'
  };
});

    return {
      role,
      level: config.displayLevel || config.level || config.threshold,
      bins: transformedBins,
      total: transformedBins.length,
      critical: transformedBins.filter(b => b.filled >= 90).length,
      timestamp: new Date()
    };
  }
}

export default EscalationService;
