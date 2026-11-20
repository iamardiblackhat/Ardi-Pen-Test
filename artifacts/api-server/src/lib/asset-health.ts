import tls from "node:tls";
import net from "node:net";

export interface AssetHealthReport {
  target: string;
  host: string;
  checkedAt: string;
  online: boolean;
  httpStatus: number | null;
  responseTimeMs: number | null;
  tls: {
    available: boolean;
    protocol: string | null;
    issuer: string | null;
    validTo: string | null;
    daysRemaining: number | null;
    expiryStatus: "healthy" | "expiring_soon" | "expired" | "unavailable";
  };
}

function extractHost(rawTarget: string): string {
  return rawTarget
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function inspectTlsCert(host: string, timeoutMs = 4000): Promise<AssetHealthReport["tls"]> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: net.isIP(host) ? undefined : host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        if (settled) return;
        settled = true;
        const protocol = socket.getProtocol() ?? null;
        const cert = socket.getPeerCertificate();
        const validTo = cert?.valid_to ?? null;
        const issuerCN =
          typeof cert?.issuer?.O === "string"
            ? cert.issuer.O
            : typeof cert?.issuer?.CN === "string"
              ? cert.issuer.CN
              : null;

        let daysRemaining: number | null = null;
        let expiryStatus: AssetHealthReport["tls"]["expiryStatus"] = "unavailable";
        if (validTo) {
          const expiryMs = Date.parse(validTo);
          if (!Number.isNaN(expiryMs)) {
            daysRemaining = Math.floor((expiryMs - Date.now()) / 86_400_000);
            if (daysRemaining < 0) expiryStatus = "expired";
            else if (daysRemaining <= 30) expiryStatus = "expiring_soon";
            else expiryStatus = "healthy";
          }
        }
        socket.destroy();
        resolve({
          available: true,
          protocol,
          issuer: issuerCN,
          validTo,
          daysRemaining,
          expiryStatus,
        });
      },
    );

    const fail = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        available: false,
        protocol: null,
        issuer: null,
        validTo: null,
        daysRemaining: null,
        expiryStatus: "unavailable",
      });
    };
    socket.once("timeout", fail);
    socket.once("error", fail);
  });
}

export async function checkAssetLiveHealth(rawTarget: string): Promise<AssetHealthReport> {
  const host = extractHost(rawTarget);
  const url = /^https?:\/\//i.test(rawTarget) ? rawTarget : `https://${host}/`;

  const start = Date.now();
  let online = false;
  let httpStatus: number | null = null;
  let responseTimeMs: number | null = null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  const httpPromise = fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: ctrl.signal,
    headers: { "user-agent": "ARDI-SEC-HealthCheck/1.0" },
  })
    .then((res) => {
      online = true;
      httpStatus = res.status;
      responseTimeMs = Date.now() - start;
    })
    .catch(() => {
      online = false;
    })
    .finally(() => clearTimeout(timer));

  const [, tlsInfo] = await Promise.all([httpPromise, inspectTlsCert(host)]);

  return {
    target: rawTarget,
    host,
    checkedAt: new Date().toISOString(),
    online,
    httpStatus,
    responseTimeMs,
    tls: tlsInfo,
  };
}
