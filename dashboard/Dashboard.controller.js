// controllers/dashboardController.js
import { DashboardService } from './Dashboard.service.js';

export const getDashboardData = async (req, res) => {
  try {
    console.log('🔥 LIVE Dashboard - 7 Parallel Queries');
    
    const [stats, topZones, topWards, topLocations, escalations, monthlyZones, todayZones] = await Promise.all([
      DashboardService.getDashboardStats(),
      DashboardService.getZoneWiseFullBins(),
      DashboardService.getWardWiseFullBins(),
      DashboardService.getTopLocations?.() || [],
      DashboardService.getEscalationLevels(),
      DashboardService.getMonthlyZoneTons?.() || [],
      DashboardService.getTodayZoneTons?.() || []
    ]);

    console.log('📊 DATA SUMMARY:', {
      zones: topZones.length,
      wards: topWards.length,
      '100% bins total': stats.fillLevels?.hundred || 0
    });

    res.json({
      success: true,
      data: {
        stats,
        topZones,    // [{ _id: "Zone A", fullBinsCount: 5 }]
        topWards,    // [{ _id: "Ward 1", fullBinsCount: 3 }]
        topLocations: topLocations || [],
        escalations,
        monthlyZones: monthlyZones || [],
        todayZones: todayZones || []
      }
    });
  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      debug: 'Check console logs for details'
    });
  }
};
