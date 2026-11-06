import { createDelivery } from "./signed_download";

const sample = { subscriberId: "sub_42", assetKey: "courses/agents/week-1.pdf", fileName: "week-1.pdf" };

createDelivery(sample)
  .then(result => console.log(JSON.stringify({ status: "ready", ...result }, null, 2)))
  .catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
