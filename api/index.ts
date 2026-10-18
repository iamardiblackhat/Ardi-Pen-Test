if (process.env.VERCEL === "1") {
  if (!process.env.TRUST_PROXY) process.env.TRUST_PROXY = "true";
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN =
      "https://ardi-pen-test-api-server-one.vercel.app";
  }
  if (!process.env.DATABASE_POOL_MAX) process.env.DATABASE_POOL_MAX = "3";
}

const { default: app } = await import("../artifacts/api-server/src/serverless");

export default app;
