import Zone from "../zone/Zone.schema.js";

export const createZone = async (data) => {

  const { zonename, totalbins,activebins,inactivebins,  status } = data;

  const formattedName = zonename?.trim().toLowerCase();

  const exist = await Zone.findOne({
    zonename: new RegExp(`^${formattedName}$`, "i"),
  });

  if (exist) throw new Error("Zone name already exists.");

 

 
  return await Zone.create({
    zonename:
      formattedName.charAt(0).toUpperCase() + formattedName.slice(1),
    totalbins,
    activebins,
    inactivebins,
    status,
    alerts: []
  });
};


export const getZones = async () => {

  const zones = await Zone.find().sort({ createdAt: -1 }).lean();

  const result = [];

  zones.forEach(zone => {

    let totalMinutes = 0;
    let clearedCount = 0;
    let tatSuccess = 0;

    // alerts exist check
    if (Array.isArray(zone.alerts) && zone.alerts.length > 0) {

      zone.alerts.forEach(a => {

        if (a.alertTime && a.clearedTime) {

          const diff = (new Date(a.clearedTime) - new Date(a.alertTime)) / (1000 * 60);

          // Ignore negative or corrupted data
          if (diff >= 0) {

            totalMinutes += diff;
            clearedCount++;

            // SLA target 30 mins
            if (diff <= 30) tatSuccess++;
          }
        }

      });
    }

    // Average mins
    const avgResponseTime =
      clearedCount > 0
        ? Number(totalMinutes / clearedCount).toFixed(1)
        : "0";

    // SLA %
    const tatCompliance =
      clearedCount > 0
        ? Number((tatSuccess / clearedCount) * 100).toFixed(1)
        : "0";


    result.push({
      _id: zone._id,
      zonename: zone.zonename,
      totalbins: zone.totalbins,
      activebins: zone.activebins,
      inactivebins: zone.inactivebins,
      status: zone.status,
      avgResponseTime,
      tatCompliance,
    });

  });

  return result;
};

export const updateZone = async (id, data) => {
  const { zonename, totalbins, activebins, inactivebins, status } = data;

  const zone = await Zone.findById(id);
  if (!zone) throw new Error("Zone not found");

  /* Prevent duplicate zone name */
  if (zonename) {
    const formattedName = zonename.trim().toLowerCase();

    const exist = await Zone.findOne({
      _id: { $ne: id },
      zonename: new RegExp(`^${formattedName}$`, "i"),
    });

    if (exist) throw new Error("Zone name already exists");

    zone.zonename =
      formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
  }

  zone.totalbins = totalbins ?? zone.totalbins;
  zone.activebins = activebins ?? zone.activebins;
  zone.inactivebins = inactivebins ?? zone.inactivebins;
  zone.status = status ?? zone.status;

  await zone.save();
  return zone;
};

/* ===================== DELETE ===================== */
export const deleteZone = async (id) => {
  const zone = await Zone.findById(id);
  if (!zone) throw new Error("Zone not found");

  await zone.deleteOne();
};