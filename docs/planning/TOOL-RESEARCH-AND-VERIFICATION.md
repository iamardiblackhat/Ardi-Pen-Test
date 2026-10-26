# Research and verification register — 25 October 2026

This is a research pool, not an installed stack or a claim that every integration works. Existing features and proposed additions are explicitly separated. No tool earns runtime verification from a README. Each chosen release needs license/dependency/data-source review as well as functional testing. Shared output schema and ARDI branding are specified in SECURITY-PLATFORM-EXPANSION.md.

| Tool | Role | GitHub source | Evidence actually obtained | Selection/proof requirement |
| --- | --- | --- | --- | --- |
| Nmap | Existing network discovery | [nmap/nmap](https://github.com/nmap/nmap) | Existing runner; local discovery + ARDI parser smoke passed | Full job/API/DB/UI proof still pending; NPSL packaging review |
| Nuclei | Existing template assessment | [projectdiscovery/nuclei](https://github.com/projectdiscovery/nuclei) | Existing runner; marker positive/negative + parser smoke passed | Actual approved template coverage and full integration pending |
| OpenCTI CE | Existing threat-intelligence store | [OpenCTI-Platform/opencti](https://github.com/OpenCTI-Platform/opencti) | Existing adapter; runtime not verified here | Verify connected feed, provenance/freshness; select CE features only |
| CyberStrike | Existing optional engine | [CyberStrikeus/CyberStrike](https://github.com/CyberStrikeus/CyberStrike) | Adapter/handoff reference only in this pass | Verify exact release/license and controlled operation; no inherited live proof |
| SpiderFoot | Structured OSINT collectors | [smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | Official source documentation reviewed; NOT executed | Allowlisted no-key modules first; known entity/domain fixtures and missing-source controls |
| Maigret | Public username/profile collection | [soxoj/maigret](https://github.com/soxoj/maigret) | Official docs + MIT license reviewed; NOT executed | Controlled owned profiles; false positives, blocked sites and identity-candidate review |
| Sherlock | Alternative username search | [sherlock-project/sherlock](https://github.com/sherlock-project/sherlock) | Official repository reviewed; NOT executed | Overlap with Maigret; compare actual coverage before selecting |
| WhatsMyName | Profile-site matching dataset | [WebBreacher/WhatsMyName](https://github.com/WebBreacher/WhatsMyName) | Official docs reviewed; NOT executed | Dataset, not full backend engine; CC BY-SA data attribution/derived-data review |
| Recon-ng | Modular OSINT workflow alternative | [lanmaster53/recon-ng](https://github.com/lanmaster53/recon-ng) | Official docs reviewed; NOT executed | Each selected marketplace module/source/key must be tested separately |
| theHarvester | Organisation/domain public evidence | [laramies/theHarvester](https://github.com/laramies/theHarvester) | Official docs reviewed; NOT executed | Start documented no-key sources; check runtime, partial results and actual source access |
| SearXNG | Self-hosted public-source metasearch | [searxng/searxng](https://github.com/searxng/searxng) | Official docs reviewed; NOT executed | AGPL + upstream search terms/availability; not guaranteed free unlimited search |
| BBOT | Recon/exposure workflow alternative | [blacklanternsecurity/bbot](https://github.com/blacklanternsecurity/bbot) | Official docs reviewed; NOT executed | Separate passive/active modules; scope rules and AGPL review; avoid duplicate orchestration |
| dnstwist | Brand/lookalike domain observation | [elceef/dnstwist](https://github.com/elceef/dnstwist) | Official docs reviewed; NOT executed | Known controlled similar domains; similarity alone is not proven impersonation |
| httpx | HTTP/TLS/technology observations | [projectdiscovery/httpx](https://github.com/projectdiscovery/httpx) | Official docs reviewed; NOT executed | Known service/header fixtures; preserve failures and observations separately |
| ZAP | Additional web assessment coverage | [zaproxy/zaproxy](https://github.com/zaproxy/zaproxy) | Official automation docs reviewed; NOT executed | Owned vulnerable + clean fixture, authenticated crawl and full job contract |
| Schemathesis | Schema-driven API testing | [schemathesis/schemathesis](https://github.com/schemathesis/schemathesis) | Official docs reviewed; NOT executed | Disposable staging API; requests may mutate/delete records; explicit test environment |
| testssl.sh | TLS protocol/cipher checks | [testssl/testssl.sh](https://github.com/testssl/testssl.sh) | Official docs reviewed; NOT executed | Controlled TLS configurations; reviewed branch documents GPLv2; exact release review |
| Naabu | Optional discovery alternative | [projectdiscovery/naabu](https://github.com/projectdiscovery/naabu) | Official repository reviewed; NOT executed | Port discovery is not full Nmap service identification; compare losses before replacement |
| Opengrep | Static source-code analysis | [opengrep/opengrep](https://github.com/opengrep/opengrep) | Official docs reviewed; NOT executed | Seeded vulnerable/clean source; LGPL engine and separate rule-set licenses |
| Gitleaks | Secret detection | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Official docs reviewed; NOT executed | Synthetic secret fixtures only; redact output. Maintainer README says feature-complete/security patches only |
| Trivy | Dependencies/images/IaC/SBOM checks | [aquasecurity/trivy](https://github.com/aquasecurity/trivy) | Official docs reviewed; NOT executed | Known vulnerable/clean fixture, DB freshness and supported scan modes |
| Dependency-Track | Persistent SBOM/component analysis | [DependencyTrack/dependency-track](https://github.com/DependencyTrack/dependency-track) | Official docs reviewed; NOT executed | Seeded SBOM and known component mapping; overlap with Trivy deliberately assigned |
| Prowler | Cloud configuration assessments | [prowler-cloud/prowler](https://github.com/prowler-cloud/prowler) | Official docs reviewed; NOT executed | Least-privilege owned cloud sandbox; distinguish open tool from hosted paid service |
| Checkov | IaC configuration assessment | [bridgecrewio/checkov](https://github.com/bridgecrewio/checkov) | Official docs reviewed; NOT executed | Seeded insecure/secure manifests; select checks available without commercial dependencies |
| Wazuh | Endpoint inventory/events/detections | [wazuh/wazuh](https://github.com/wazuh/wazuh) | Official docs reviewed; NOT executed | Enrolled disposable host, heartbeat and synthetic event through ARDI; server/agent required |
| Falco | Linux/container runtime detection | [falcosecurity/falco](https://github.com/falcosecurity/falco) | Official docs reviewed; NOT executed | Compatible Linux sensor/driver and controlled rule event; unavailable on arbitrary unconnected hosts |
| Velociraptor | Endpoint artifact collection | [velocidex/velociraptor](https://github.com/velocidex/velociraptor) | Official docs reviewed; NOT executed | Owned enrolled lab endpoint and approved collection; recheck release/docs freshness |
| Zeek | Network telemetry analysis | [zeek/zeek](https://github.com/zeek/zeek) | Official docs reviewed; NOT executed | Known capture or connected passive sensor; not a remote-network visibility shortcut |
| Suricata | Network detection | [OISF/suricata](https://github.com/OISF/suricata) | Official docs reviewed; NOT executed | Synthetic capture/event + rule provenance; passive integration before considering inline blocking |
| IRIS | Incident case backend candidate | [dfir-iris/iris-web](https://github.com/dfir-iris/iris-web) | Official docs reviewed; NOT executed | Evaluate stable release, API fit and LGPL obligations; do not adopt documented beta by default |
| ClamAV | Signature-based file triage | [Cisco-Talos/clamav](https://github.com/Cisco-Talos/clamav) | Official docs reviewed; NOT executed | EICAR benign test and clean fixture, signature freshness, isolated upload handling |
| YARA-X | Rule-based file inspection | [VirusTotal/yara-x](https://github.com/VirusTotal/yara-x) | Official docs reviewed; NOT executed | Controlled matching/nonmatching files and rule licenses; prefer evaluation over maintenance-mode legacy YARA |
| MobSF | Mobile package analysis | [MobSF/Mobile-Security-Framework-MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) | Official docs reviewed; NOT executed | Owned test packages; static first; dynamic needs its own proven instrumented lab |
| garak | AI endpoint robustness assessment | [NVIDIA/garak](https://github.com/NVIDIA/garak) | Official docs reviewed; NOT executed | Approved fixture endpoint, deterministic probes and strict request/token budget |
| PyRIT | AI assessment orchestration alternative | [microsoft/PyRIT](https://github.com/microsoft/PyRIT) | Official docs reviewed; NOT executed | Use current Microsoft repo (moved from Azure); evaluate overlap with garak and model cost |
| Keycloak | Optional identity/MFA/SSO foundation | [keycloak/keycloak](https://github.com/keycloak/keycloak) | Official docs reviewed; NOT executed | Auth architecture decision; real login/MFA/session revocation and tenant-role checks before migration |
| Gotenberg | Actual PDF generation | [gotenberg/gotenberg](https://github.com/gotenberg/gotenberg) | Official docs reviewed; NOT executed | Known ARDI report → actual PDF bytes/content; isolated self-hosted service required |

## Not selected by default

PhoneInfoga: official README describes it as stable but unmaintained, requires configured scanners, and explicitly disclaims verified data and precise/real-time phone tracking. Do not turn its marketing into an ARDI promise. Source: https://github.com/sundowndev/phoneinfoga . An alternative phone-metadata module must earn its own proof and may provide formatting/country/line metadata without establishing a person’s identity.

Legacy YARA: official README declares maintenance mode and points to YARA-X. Gitleaks also declares feature-complete/security-patch maintenance; compare current maintained alternatives before locking a production dependency. A candidate is not rejected solely for being mature; operational maintenance risk is recorded.

WhatsMyName is a dataset with attribution/share-alike terms, not a ready-made investigation service. Some OSINT modules require paid APIs, accounts or source access. Free engine software alone does not establish free complete data coverage.

## Actual tests completed in this pass

Evidence directory: /Users/aaronaccount/Documents/Codex/2026-10-21/gi/outputs/ardi-tool-verification/

- Nmap 7.99 scanned one ephemeral 127.0.0.1 TCP port belonging to a disposable HTTP fixture. Open port and HTTP service were returned in nmap.xml.
- Nuclei 3.11.0 ran only the custom benign fixture template: one marker match, then zero matches after the server marker was removed. External OAST/update checks were disabled.
- Existing ARDI Nmap/Nuclei parsers at source revision 4cf347f were bundled into the evidence directory and read the real outputs: one Nmap finding, one positive Nuclei finding, zero negative findings, with no skipped positive record.
- Test fixture shut down afterwards. No external scan target, real-person investigation, provider charge, production account or database was used.

Limits: these are CLI and parser smoke tests only. Not proof of vulnerability-template quality, people-search coverage, live research/feeds, application job lifecycle, tenant isolation, full UI/API/DB/report integration or production deployment. All other runtime claims above remain unverified. Application dependencies were not installed and website code was not changed.

Reproduction: verify_scanners.py followed by check-ardi-parsers.mjs in the evidence directory; parser bundles reflect the recorded source revision, not future edits.
