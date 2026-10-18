// Same-origin /api on Vercel. The filesystem route wins over the SPA rewrite,
// so this replaces the old proxy to the GCP VM.
export { default } from "../artifacts/api-server/src/serverless";
