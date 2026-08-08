import { createHash, randomUUID } from "node:crypto";

/**
 * STIX 2.1 export — the outbound half of the OpenCTI integration.
 *
 * Enrichment (`enrich.ts`) pulls intel *in*; this pushes Ardi's own findings
 * *out* as a STIX bundle, so a client who already runs OpenCTI sees pentest
 * results alongside the rest of their intelligence instead of in a silo.
 * The bundle is ingestible by any STIX 2.1 consumer, not just OpenCTI.
 *
 * Spec: STIX 2.1 OASIS standard, §4 (SDOs) and §5 (SROs).
 */

/** OASIS-defined namespace for deterministic STIX 2.1 object UUIDs (§2.9). */
const STIX_NAMESPACE = "00abedb4-aa42-466c-9c01-fed23315a9b7";

export interface StixObject {
  type: string;
  spec_version?: string;
  id: string;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface StixBundle {
  type: "bundle";
  id: string;
  objects: StixObject[];
}

export interface ExportableFinding {
  id: number;
  title: string;
  description: string;
  remediation: string;
  severity: string;
  status: string;
  category: string;
  cve: string | null;
  cvss: number | null;
  mitreId: string;
  mitreTactic: string;
  mitreTechnique: string;
  assetName: string;
  assetTarget: string | null;
  createdAt: string;
}

export interface ExportOptions {
  /** Name of the organisation running Ardi — becomes the STIX `identity`. */
  producerName: string;
  /**
   * Marking applied to every object. Pentest findings describe live customer
   * weaknesses, so default to the most restrictive TLP rather than the
   * permissive default most exporters ship.
   */
  tlp?: "clear" | "green" | "amber" | "amber+strict" | "red";
}

/** TLP marking-definition IDs are fixed by the STIX 2.1 spec. */
const TLP_IDS: Record<string, string> = {
  clear: "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9",
  green: "marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da",
  amber: "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82",
  "amber+strict": "marking-definition--826578e1-40ad-459f-bc73-ede076f81f37",
  red: "marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed",
};

/**
 * STIX 2.1 requires UUIDv5 over the object's ID contributing properties, so the
 * same finding exported twice produces the same STIX ID and OpenCTI updates
 * rather than duplicates. Implemented directly — Node has no built-in v5.
 */
function uuidv5(name: string, namespace: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(Buffer.from(name, "utf8"))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function deterministicId(type: string, contributing: Record<string, unknown>): string {
  // Key order must be stable or the same object yields different IDs.
  const canonical = JSON.stringify(contributing, Object.keys(contributing).sort());
  return `${type}--${uuidv5(canonical, STIX_NAMESPACE)}`;
}

/** Ardi severity → the closest STIX/OpenCTI severity vocabulary term. */
function severityToStix(severity: string): string {
  const map: Record<string, string> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
    info: "none",
  };
  return map[severity.toLowerCase()] ?? "unknown";
}

/**
 * Convert findings into a STIX 2.1 bundle.
 *
 * Object graph per finding:
 *   identity (producer)  — created once for the whole bundle
 *   vulnerability        — when the finding carries a CVE
 *   attack-pattern       — the MITRE technique
 *   infrastructure       — the scanned asset
 *   report               — the finding itself, tying the above together
 *   relationship         — report→vulnerability, report→attack-pattern,
 *                          vulnerability→infrastructure
 */
export function findingsToStixBundle(
  findings: ExportableFinding[],
  options: ExportOptions,
): StixBundle {
  const tlp = options.tlp ?? "amber+strict";
  const markingId = TLP_IDS[tlp];
  if (!markingId) {
    throw new Error(`Unknown TLP marking: ${tlp}`);
  }

  const now = new Date().toISOString();
  const objects: StixObject[] = [];
  const emitted = new Set<string>();

  const push = (object: StixObject): string => {
    if (!emitted.has(object.id)) {
      emitted.add(object.id);
      objects.push(object);
    }
    return object.id;
  };

  const base = {
    spec_version: "2.1",
    created: now,
    modified: now,
    object_marking_refs: [markingId],
  };

  const identityId = push({
    ...base,
    type: "identity",
    id: deterministicId("identity", { name: options.producerName, class: "organization" }),
    name: options.producerName,
    identity_class: "organization",
  });

  const withCreator = { ...base, created_by_ref: identityId };

  for (const finding of findings) {
    const infrastructureId = push({
      ...withCreator,
      type: "infrastructure",
      id: deterministicId("infrastructure", { name: finding.assetName }),
      name: finding.assetName,
      infrastructure_types: ["hosting"],
      ...(finding.assetTarget ? { aliases: [finding.assetTarget] } : {}),
    });

    let vulnerabilityId: string | null = null;
    if (finding.cve) {
      vulnerabilityId = push({
        ...withCreator,
        type: "vulnerability",
        id: deterministicId("vulnerability", { name: finding.cve }),
        name: finding.cve,
        description: finding.description,
        external_references: [{ source_name: "cve", external_id: finding.cve }],
        ...(finding.cvss !== null ? { x_opencti_cvss_base_score: finding.cvss } : {}),
      });
    }

    let attackPatternId: string | null = null;
    if (finding.mitreId) {
      attackPatternId = push({
        ...withCreator,
        type: "attack-pattern",
        id: deterministicId("attack-pattern", { x_mitre_id: finding.mitreId }),
        name: finding.mitreTechnique || finding.mitreId,
        external_references: [
          {
            source_name: "mitre-attack",
            external_id: finding.mitreId,
            url: `https://attack.mitre.org/techniques/${finding.mitreId.replace(".", "/")}/`,
          },
        ],
        kill_chain_phases: finding.mitreTactic
          ? [{ kill_chain_name: "mitre-attack", phase_name: finding.mitreTactic }]
          : [],
      });
    }

    const reportId = push({
      ...withCreator,
      type: "report",
      id: deterministicId("report", { ardi_finding_id: finding.id }),
      name: finding.title,
      description: `${finding.description}\n\nRemediation: ${finding.remediation}`,
      report_types: ["vulnerability"],
      published: finding.createdAt,
      object_refs: [
        infrastructureId,
        ...(vulnerabilityId ? [vulnerabilityId] : []),
        ...(attackPatternId ? [attackPatternId] : []),
      ],
      x_opencti_report_status: finding.status,
      x_ardi_severity: severityToStix(finding.severity),
      x_ardi_category: finding.category,
    });

    if (vulnerabilityId) {
      push({
        ...withCreator,
        type: "relationship",
        id: deterministicId("relationship", {
          source: vulnerabilityId,
          target: infrastructureId,
          type: "has",
        }),
        relationship_type: "has",
        source_ref: infrastructureId,
        target_ref: vulnerabilityId,
      });
    }

    if (attackPatternId && vulnerabilityId) {
      push({
        ...withCreator,
        type: "relationship",
        id: deterministicId("relationship", {
          source: attackPatternId,
          target: vulnerabilityId,
          type: "targets",
        }),
        relationship_type: "targets",
        source_ref: attackPatternId,
        target_ref: vulnerabilityId,
      });
    }

    void reportId;
  }

  return {
    type: "bundle",
    // Bundle IDs are explicitly NOT deterministic in STIX 2.1 (§4.1) —
    // each transmission is its own bundle.
    id: `bundle--${randomUUID()}`,
    objects,
  };
}
