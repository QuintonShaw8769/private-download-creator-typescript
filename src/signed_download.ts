import { z } from "zod";
import { infrai } from "./infrai";

export const deliveryRequest = z.object({
  subscriberId: z.string().min(1),
  assetKey: z.string().min(1),
  fileName: z.string().min(1),
});
export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export type ContentState = { assetKey: string; processedKey: string; subscriberId: string; status: "processed" };

export function processContent(request: DeliveryRequest): ContentState {
  return { assetKey: request.assetKey, processedKey: `processed/${request.assetKey}`, subscriberId: request.subscriberId, status: "processed" };
}

export function subscriberUpdate(state: ContentState) {
  return { subscriberId: state.subscriberId, assetKey: state.assetKey, event: "asset.processed" as const, processedKey: state.processedKey };
}

const bucket = "creator-private-assets";

export async function createDelivery(input: unknown) {
  const request = deliveryRequest.parse(input);
  await infrai.storage.bucket.create({ name: bucket });
  const signed = await infrai.storage.object.presign(bucket, request.assetKey, {
    op: "get",
    expires_seconds: 600,
    response_disposition: `attachment; filename="${request.fileName}"`,
    idempotency_key: `delivery-${request.subscriberId}-${request.assetKey}`,
  });
  return { subscriberId: request.subscriberId, assetKey: request.assetKey, downloadUrl: signed.url, expiresSeconds: 600 };
}
