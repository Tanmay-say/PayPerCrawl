/**
 * Vercel serverless handler — wraps the Express app.
 *
 * vercel.json rewrites all incoming paths (`/api/*` and `/gateway/*`) to this
 * single function so Express continues to handle routing internally. We do NOT
 * call app.listen(); Vercel invokes Express's `(req, res)` handler directly.
 *
 * Connections (Prisma, optional Redis) are lazy: Prisma client is created in
 * src/lib/prisma.ts and reused across cold starts via globalThis caching.
 * Redis is only attempted on first hit and disables itself silently if unset.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app.js";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

export const config = {
  // The Express app handles its own body parsing; let Vercel pass the raw stream.
  api: { bodyParser: false },
};
