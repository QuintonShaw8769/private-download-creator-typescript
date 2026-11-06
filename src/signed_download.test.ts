import { deliveryRequest, processContent, subscriberUpdate } from "./signed_download";

const valid = deliveryRequest.safeParse({ subscriberId: "sub_1", assetKey: "posts/hello.pdf", fileName: "hello.pdf" });
if (!valid.success) throw new Error("expected a valid delivery request");
const invalid = deliveryRequest.safeParse({ subscriberId: "", assetKey: "posts/hello.pdf", fileName: "hello.pdf" });
if (invalid.success) throw new Error("empty subscriber must be rejected");
const state = processContent(valid.data);
if (subscriberUpdate(state).event !== "asset.processed") throw new Error("processed event expected");
console.log("delivery request boundary: ok");
