// services/escalationService.js - PRODUCTION READY
import Bin from "../bins/Bin.schema.js";

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
    // FILL THRESHOLDS (Fluctuation-aware)
    // ================================
    
    // 75% → Ward Supervisor (reset if dropped <60%)
    const last75 = bin.escalation.thresholdsHit['75%'];
    let shouldAlert75 = true;
    
    if (last75?.time) {
      const hoursSince = (now - new Date(last75.time)) / (1000 * 60 * 60);
      const droppedBelow60 = bin.history?.some(h => 
        new Date(h.timestamp) > new Date(last75.time) && h.fill_level < 60
      ) || false;
      
      shouldAlert75 = droppedBelow60 || hoursSince > 1; // 1hr cooldown
    }
    
    if (fillLevel >= 75 && shouldAlert75) {
      console.log('✅ 75% → Ward Supervisor');
      bin.escalation.thresholdsHit['75%'] = {
        time: now,
        notified: ['Ward Supervisor']
      };
      bin.escalation.status = '75%';
      rolesToNotify.push('Ward Supervisor');
      await bin.save();
    }

    // 90% → Sanitary Inspectors (one-time per day)
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

    // 100% → Full Alert (one-time)
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
    // TIME-BASED ESCALATIONS (100% + time)
    // ================================
    if (fillLevel >= 100 && bin.lastFullAt) {
      const fullMins = (now - new Date(bin.lastFullAt)) / (1000 * 60);
      bin.escalation.timeEscalations = bin.escalation.timeEscalations || [];

      // L1: 21+ mins → ACHO
      if (fullMins >= 21 && !bin.escalation.timeEscalations.some(e => e.level === 'L1')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → ACHO - L1`);
        bin.escalation.timeEscalations.push({
          level: 'L1', role: 'ACHO', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L1';
        rolesToNotify.push('ACHO - L1');
        await bin.save();
      }

      // L2: 31+ mins → CHO
      if (fullMins >= 31 && !bin.escalation.timeEscalations.some(e => e.level === 'L2')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → CHO - L2`);
        bin.escalation.timeEscalations.push({
          level: 'L2', role: 'CHO', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L2';
        rolesToNotify.push('CHO - L2');
        await bin.save();
      }

      // L3: 51+ mins → Deputy Commissioner
      if (fullMins >= 51 && !bin.escalation.timeEscalations.some(e => e.level === 'L3')) {
        console.log(`⏰ ${fullMins.toFixed(0)}m → Deputy Commissioner - L3`);
        bin.escalation.timeEscalations.push({
          level: 'L3', role: 'Deputy Commissioner', minutes: Math.round(fullMins), time: now
        });
        bin.escalation.status = 'L3';
        rolesToNotify.push('Deputy Commissioner - L3');
        await bin.save();
      }

      // L4: 61+ mins → Commissioner
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

  static async getRoleEscalations(role) {
  const roleConfig = {
    // Percentage roles
    'Ward Supervisor': { 
      type: 'fill', 
      minFill: 75, 
      maxFill: 89, 
      threshold: '75%',
      level: '75%'
    },
    'SI - Sanitary Inspectors': { 
      type: 'fill', 
      minFill: 90, 
      maxFill: 99, 
      threshold: '90%', 
      level: '90%'
    },
    'Sanitary Office': { 
      type: 'fill', 
      minFill: 100, 
      maxFill: 100, 
      threshold: '100%',
      level: '100%'
    },
    // 🔥 FIXED L1-L4 - Added role field matching
    'ACHO': { 
      type: 'time', 
      level: 'L1',
      displayLevel: 'L1 (21+ mins)'
    },
    'CHO': { 
      type: 'time', 
      level: 'L2',
      displayLevel: 'L2 (31+ mins)'
    },
    'Deputy Commissioner': { 
      type: 'time', 
      level: 'L3',
      displayLevel: 'L3 (51+ mins)'
    },
    'Commissioner': { 
      type: 'time', 
      level: 'L4',
      displayLevel: 'L4 (61+ mins)'
    }
  };

  const config = roleConfig[role];
  if (!config) throw new Error(`Role ${role} not configured`);

  let query = {};
  
  if (config.type === 'time') {
    // 🔥 FIXED: Match BOTH level AND role in timeEscalations
    query = {
      'escalation.timeEscalations': {
        $elemMatch: { 
          level: config.level, 
          role: role  // ← CRITICAL: Match exact role
        }
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
    .select('binid filled zone ward status escalation')
    .sort({ filled: -1 });

  const transformedBins = bins.map(bin => {
    const roleEscalation = config.type === 'time' 
      ? bin.escalation.timeEscalations?.find(e => e.level === config.level)
      : bin.escalation.thresholdsHit?.[config.threshold];
    
    return {
      binid: bin.binid,
      filled: bin.filled,
      zone: bin.zone,
      ward: bin.ward,
      status: bin.status,
      escalatedAt: roleEscalation?.time,
      notified: roleEscalation?.notified || [role],
      priority: bin.filled >= 90 ? 'HIGH' : 'MEDIUM'
    };
  });

  return {
    role,
    level: config.displayLevel || config.level || config.threshold,  // ✅ FIXED LEVEL
    bins: transformedBins,
    total: transformedBins.length,
    critical: transformedBins.filter(b => b.filled >= 90).length,
    timestamp: new Date()
  };
}
}

export default EscalationService;
