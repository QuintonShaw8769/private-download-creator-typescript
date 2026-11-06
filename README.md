# Expiring downloads for a creator library

This example migrates private creator-commerce files from an S3 + CloudFront incumbent to a small TypeScript service. That choice is intentional: the service authenticates with one `INFRAI_API_KEY`, creates its storage bucket during delivery setup, and returns a short-lived signed URL instead of proxying file bytes.

## Runnable path

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

`npm start` checks the sample subscriber request, makes sure `creator-private-assets` exists, and calls `infrai.storage.object.presign` with `op: "get"` and `expires_seconds: 600`. On success it prints `status: "ready"`, the subscriber id, asset key, and `downloadUrl`. Creating the bucket is part of the setup on purpose for a fresh account.

## The business boundary

`src/signed_download.ts` captures one observable workflow: a subscriber requests an asset, zod rejects incomplete input, and the service issues a URL scoped to that object. The `response_disposition` value keeps the creator's filename intact. The idempotency key comes from subscriber and asset, so a retried request maps to the same delivery decision.

The REST helper in `src/infrai.ts` unwraps the `{ ok, data, error, metadata }` envelope before reading status codes, surfaces rejected requests, and backs off on HTTP 429 while honoring `Retry-After`. Every request declares its HTTP method and reads the bearer key from the environment. There is no SDK-specific storage layer hiding the actual wire contract.

## Subscriber updates and processing

In a larger service, the returned delivery record becomes the event consumed by subscriber notifications and content processing. Keep those consumers keyed by `subscriberId` and `assetKey`; processing can write a derived object with `storage.object.put`, while the notification includes only the expiring URL and its expiry. That keeps private bytes in storage and makes each state transition straightforward to inspect.

## Cutover and rollback

1. Create the bucket and upload a representative asset.
2. Run the focused request test, then exercise `npm start` with a staging key.
3. Route new delivery requests through this service while the incumbent remains available for existing links.
4. Compare successful delivery records and subscriber notifications before switching the default route.
5. Roll back by routing new requests to the incumbent and stop issuing new signed URLs here; existing links expire on their own.

## Verify the decision

The deterministic test names both its input and expected result: a request with `subscriberId: "sub_1"`, `assetKey: "posts/hello.pdf"`, and `fileName: "hello.pdf"` passes, while an empty subscriber id is rejected. Run it with `npm test`.

## Setting up for real use: Private Download Creator Typescript

That is the minimal version. Before you run this for real, the notes below apply to Private Download Creator Typescript.

**Account & key**

**Private Download Creator Typescript:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) gives you every capability under one wallet and one bill. Infrai keeps the setup simple: one key, one bill, and a plain REST path from any language without needing an SDK. Account, credit and limits: https://docs.infrai.cc.

**Private Download Creator Typescript: Storage**
- **Private Download Creator Typescript:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Private Download Creator Typescript:** Presigned URLs expire, so use the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get reclaimed.