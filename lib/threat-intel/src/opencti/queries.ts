/**
 * Fixed GraphQL documents. Caller input is *always* bound through `$variables`
 * — never string-interpolated — because the CVE and technique IDs that reach
 * these queries come from scanner output, which an attacker can influence by
 * controlling what a scanned host reports.
 */

const VULNERABILITY_FIELDS = `
  id
  standard_id
  name
  description
  created
  modified
  x_opencti_cvss_base_score
  x_opencti_cvss_base_severity
  x_opencti_epss_score
  x_opencti_epss_percentile
  x_opencti_cisa_kev
`;

const ATTACK_PATTERN_FIELDS = `
  id
  standard_id
  name
  description
  x_mitre_id
  x_mitre_platforms
  x_mitre_detection
  killChainPhases { kill_chain_name phase_name }
`;

/** Look up one CVE by its canonical name, e.g. "CVE-2024-3400". */
export const VULNERABILITY_BY_NAME = `
  query ArdiVulnerabilityByName($filters: FilterGroup) {
    vulnerabilities(filters: $filters, first: 1) {
      edges { node { ${VULNERABILITY_FIELDS} } }
    }
  }
`;

/** Batch-resolve many CVEs in one round trip. */
export const VULNERABILITIES_BY_NAMES = `
  query ArdiVulnerabilitiesByNames($filters: FilterGroup, $first: Int!) {
    vulnerabilities(filters: $filters, first: $first) {
      edges { node { ${VULNERABILITY_FIELDS} } }
    }
  }
`;

/** Look up one ATT&CK technique by its MITRE ID, e.g. "T1190". */
export const ATTACK_PATTERN_BY_MITRE_ID = `
  query ArdiAttackPatternByMitreId($filters: FilterGroup) {
    attackPatterns(filters: $filters, first: 1) {
      edges { node { ${ATTACK_PATTERN_FIELDS} } }
    }
  }
`;

/**
 * Threat actors and campaigns related to an entity.
 *
 * `toId` is the vulnerability or attack pattern; the `from` side is whatever
 * targets or uses it. We filter client-side to intrusion sets, campaigns, and
 * malware because OpenCTI will happily return reports and notes here too.
 */
export const THREATS_RELATED_TO_ENTITY = `
  query ArdiThreatsRelatedToEntity($toId: StixRef!, $first: Int!) {
    stixCoreRelationships(toId: $toId, first: $first) {
      edges {
        node {
          id
          relationship_type
          from {
            ... on StixDomainObject {
              id
              standard_id
              entity_type
            }
            ... on IntrusionSet { name description aliases }
            ... on Campaign { name description aliases }
            ... on Malware { name description aliases }
          }
        }
      }
    }
  }
`;
