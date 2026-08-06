import { Router } from "express";
import {
  GetComplianceFrameworksResponse,
  GetComplianceFrameworkParams,
  GetComplianceFrameworkResponse,
  GetComplianceSummaryResponse,
} from "@workspace/api-zod";

const router = Router();

// Static compliance data (demo)
const FRAMEWORKS = [
  {
    id: "soc2",
    name: "SOC 2 Type II",
    version: "2017",
    score: 78,
    controlsPassed: 47,
    controlsFailed: 13,
    controlsTotal: 60,
    lastAssessedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "partial",
    controls: [
      { id: "CC6.1", name: "Logical and Physical Access Controls", status: "passed", category: "Access Control", findings: [1, 3], description: "The entity implements logical access security software, infrastructure, and architectures over protected information assets." },
      { id: "CC6.2", name: "Prior to Issuing System Credentials", status: "passed", category: "Access Control", findings: [], description: "Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users." },
      { id: "CC6.3", name: "Role-Based Access Control", status: "failed", category: "Access Control", findings: [2, 5], description: "The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets." },
      { id: "CC7.1", name: "System Components Monitoring", status: "passed", category: "System Operations", findings: [], description: "To meet its objectives, the entity uses detection and monitoring procedures to identify changes to configurations." },
      { id: "CC7.2", name: "Security Events Identification", status: "partial", category: "System Operations", findings: [4], description: "The entity monitors system components and the operation of controls for anomalies." },
      { id: "CC8.1", name: "Change Management Process", status: "passed", category: "Change Management", findings: [], description: "The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes." },
      { id: "CC9.1", name: "Risk Mitigation Strategies", status: "failed", category: "Risk Mitigation", findings: [6, 7], description: "The entity identifies, selects, and develops risk mitigation activities." },
    ],
  },
  {
    id: "pcidss",
    name: "PCI DSS",
    version: "4.0",
    score: 65,
    controlsPassed: 39,
    controlsFailed: 21,
    controlsTotal: 60,
    lastAssessedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "non_compliant",
    controls: [
      { id: "1.1", name: "Network Security Controls", status: "passed", category: "Network Security", findings: [], description: "Processes and mechanisms for installing and maintaining network security controls are defined and understood." },
      { id: "2.2", name: "System Components Configurations", status: "failed", category: "Secure Configurations", findings: [1, 2, 3], description: "System components are configured and managed securely." },
      { id: "6.3", name: "Security Vulnerabilities Identified", status: "partial", category: "Vulnerability Management", findings: [4], description: "Security vulnerabilities are identified and addressed." },
      { id: "8.2", name: "User Identification and Authentication", status: "failed", category: "Access Control", findings: [5, 6], description: "User identification and authentication for users and administrators on all system components is managed." },
      { id: "10.2", name: "Audit Logs Implemented", status: "passed", category: "Logging", findings: [], description: "Audit logs are implemented to support the detection of anomalies and suspicious activity." },
    ],
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    version: "2022",
    score: 82,
    controlsPassed: 82,
    controlsFailed: 18,
    controlsTotal: 100,
    lastAssessedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "partial",
    controls: [
      { id: "A.5.1", name: "Information Security Policies", status: "passed", category: "Organizational Controls", findings: [], description: "Information security policies shall be defined, approved by management, published, and communicated." },
      { id: "A.8.1", name: "User Endpoint Devices", status: "passed", category: "Asset Management", findings: [], description: "Information stored on, processed by or accessible via user endpoint devices shall be protected." },
      { id: "A.8.8", name: "Management of Technical Vulnerabilities", status: "failed", category: "Asset Management", findings: [1, 2], description: "Information about technical vulnerabilities of information systems in use shall be obtained in a timely fashion." },
      { id: "A.9.1", name: "Access Control Policy", status: "passed", category: "Access Control", findings: [], description: "An access control policy shall be established, documented, and reviewed based on business and information security requirements." },
    ],
  },
  {
    id: "hipaa",
    name: "HIPAA",
    version: "2023",
    score: 71,
    controlsPassed: 35,
    controlsFailed: 14,
    controlsTotal: 49,
    lastAssessedAt: null,
    status: "not_assessed",
    controls: [
      { id: "164.312(a)(1)", name: "Access Control", status: "partial", category: "Technical Safeguards", findings: [1], description: "Implement technical policies and procedures for electronic information systems that maintain electronic protected health information." },
      { id: "164.312(b)", name: "Audit Controls", status: "passed", category: "Technical Safeguards", findings: [], description: "Implement hardware, software, and/or procedural mechanisms to record and examine activity in information systems." },
      { id: "164.312(c)(1)", name: "Integrity", status: "failed", category: "Technical Safeguards", findings: [2, 3], description: "Implement policies and procedures to protect electronic protected health information from improper alteration or destruction." },
    ],
  },
];

// GET /api/compliance/frameworks
router.get("/compliance/frameworks", async (req, res): Promise<void> => {
  const frameworks = FRAMEWORKS.map(f => ({
    id: f.id,
    name: f.name,
    version: f.version,
    score: f.score,
    controlsPassed: f.controlsPassed,
    controlsFailed: f.controlsFailed,
    controlsTotal: f.controlsTotal,
    lastAssessedAt: f.lastAssessedAt,
    status: f.status,
  }));
  res.json(GetComplianceFrameworksResponse.parse(frameworks));
});

// GET /api/compliance/frameworks/:id
router.get("/compliance/frameworks/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetComplianceFrameworkParams.safeParse({ id: rawId });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const framework = FRAMEWORKS.find(f => f.id === parsed.data.id);
  if (!framework) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetComplianceFrameworkResponse.parse(framework));
});

// GET /api/compliance/summary
router.get("/compliance/summary", async (req, res): Promise<void> => {
  const overallScore = Math.round(
    FRAMEWORKS.reduce((sum, f) => sum + f.score, 0) / FRAMEWORKS.length
  );
  const topGaps = [
    { control: "Role-Based Access Control (CC6.3)", framework: "SOC 2", severity: "high" },
    { control: "User Identification and Authentication (8.2)", framework: "PCI DSS", severity: "critical" },
    { control: "Management of Technical Vulnerabilities (A.8.8)", framework: "ISO 27001", severity: "high" },
    { control: "System Components Configurations (2.2)", framework: "PCI DSS", severity: "critical" },
    { control: "Integrity Controls (164.312(c)(1))", framework: "HIPAA", severity: "medium" },
  ];
  res.json(GetComplianceSummaryResponse.parse({
    overallScore,
    frameworks: FRAMEWORKS.map(f => ({ name: f.name, score: f.score })),
    topGaps,
  }));
});

export default router;
