import cron from "node-cron";
// import { syncOutsourceBins } from "../bins/Bin.service.js";

// cron.schedule("*/5 * * * *", async () => {
//   console.log("Syncing outsource bin data...");
//   await syncOutsourceBins();
// });

import { saveEndOfDayData } from "../bins/Bin.service.js";

cron.schedule("59 23 * * *", () => {
  saveEndOfDayData();
   console.log("Syncing daily bin data...");
});
