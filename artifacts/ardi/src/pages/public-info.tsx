import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import './public-info.css';

type InfoSection = {
  heading: string;
  body: string;
};

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: InfoSection[];
};

function PublicInfoPage({ eyebrow, title, introduction, sections }: PublicInfoPageProps) {
  return (
    <div className="ardi-info-page">
      <header className="ardi-info-header">
        <Link href="/" className="ardi-info-brand">ARDI SEC <small>AUTHORISED SECURITY LAB</small></Link>
        <Link href="/" className="ardi-info-back"><ArrowLeft /> Back to security lab</Link>
      </header>
      <main className="ardi-info-main">
        <p className="ardi-info-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="ardi-info-intro">{introduction}</p>
        <p className="ardi-info-date">Last updated 1 September 2026</p>
        <div className="ardi-info-sections">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h2>{section.heading}</h2><p>{section.body}</p></div>
            </section>
          ))}
        </div>
        <div className="ardi-info-actions"><Link href="/register">Create a workspace <ArrowRight /></Link><Link href="/faq">Read common questions <ArrowRight /></Link></div>
      </main>
      <footer className="ardi-info-footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/faq">FAQs</Link></footer>
    </div>
  );
}

export function Terms() {
  return <PublicInfoPage eyebrow="LEGAL / TERMS" title="Terms of authorised use." introduction="These terms set the ground rules for using Ardi Sec as an authorised security workspace." sections={[
    { heading: 'Authorisation comes first', body: 'Use Ardi Sec only on systems you own or have explicit permission to assess. You are responsible for defining and respecting the approved scope.' },
    { heading: 'Keep the workspace lawful', body: 'Do not use the service to disrupt systems, access data without permission, evade safeguards, distribute malware, or carry out unlawful activity.' },
    { heading: 'Protect account access', body: 'Keep sign-in details secure and ensure workspace members have the authority and role they need. Report suspected account misuse promptly through the available support channel.' },
    { heading: 'Evidence needs review', body: 'Security results support professional judgement; they do not guarantee that a system is secure or compliant. Validate findings before acting on them or sharing a report.' },
    { heading: 'Service changes', body: 'Features and integrations may change as the product develops. Material changes to these terms will be reflected on this page with an updated date.' },
  ]} />;
}

export function Privacy() {
  return <PublicInfoPage eyebrow="LEGAL / PRIVACY" title="Privacy without guesswork." introduction="This notice explains the categories of information the Ardi Sec workspace is designed to process and why." sections={[
    { heading: 'Information you provide', body: 'The workspace may process account details, approved asset information, assessment configuration, findings, reports, intelligence queries, and messages you submit to ARDI.' },
    { heading: 'Operational information', body: 'Security and reliability logs may include timestamps, browser or device information, network identifiers, request status, and actions taken inside the workspace.' },
    { heading: 'How information is used', body: 'Information is used to provide the requested workspace features, protect accounts, troubleshoot faults, maintain auditability, and improve product reliability.' },
    { heading: 'Sharing and processors', body: 'Information may be handled by infrastructure and service providers needed to operate the product. Ardi Sec does not present workspace data as public content.' },
    { heading: 'Retention and choices', body: 'Retention depends on the type of workspace record, operational need, and applicable obligations. Use the available account or support channel for access, correction, export, or deletion requests.' },
  ]} />;
}

export function Cookies() {
  return <PublicInfoPage eyebrow="LEGAL / COOKIES" title="Essential storage, explained." introduction="Ardi Sec uses browser storage where it is needed to run the workspace and remember limited interface state." sections={[
    { heading: 'Sign-in and security', body: 'Authentication and security storage keeps a session working, protects account access, and helps prevent misuse.' },
    { heading: 'Interface preferences', body: 'The product may remember limited choices such as whether a mobile introduction has already been shown during the current session.' },
    { heading: 'Service measurement', body: 'Operational measurement may be used to understand reliability and errors. It should not be treated as permission to insert unnecessary advertising trackers.' },
    { heading: 'Your controls', body: 'Browser controls can clear or block storage, but disabling essential storage may stop sign-in or workspace features from operating correctly.' },
  ]} />;
}

export function Faq() {
  return <PublicInfoPage eyebrow="SUPPORT / FAQ" title="Common questions, direct answers." introduction="Short answers about scope, testing, evidence, intelligence, and ARDI." sections={[
    { heading: 'What are the four homepage steps?', body: 'They describe the authorised workflow: confirm permission, test only approved systems, review the returned evidence, then investigate relevant context.' },
    { heading: 'Does ARDI launch tests by itself?', body: 'ARDI guides users into the correct product route. A test should run only after an authorised target and the required assessment details are confirmed.' },
    { heading: 'Is OpenCTI connected?', body: 'No OpenCTI deployment is currently connected. Ardi Sec does not show a substitute dashboard or sample threat records. Live enrichment will appear only after a real OpenCTI instance is configured.' },
    { heading: 'Is a finding proof of compromise?', body: 'No. A finding is evidence that requires review. Confirm the affected asset, technical detail, reproducibility, and scope before deciding what it means.' },
    { heading: 'Can I use Ardi Sec on any website?', body: 'No. Use it only where you own the target or have explicit permission to perform the stated security work.' },
  ]} />;
}
