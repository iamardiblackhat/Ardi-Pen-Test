import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";
import { useArdiAssistant } from "@/features/ardi/ardi-assistant-provider";
import { SecurityFooter } from "@/features/security-home/components/security-footer";
import { SecurityHeader } from "@/features/security-home/components/security-header";
import {
  securityControls,
  securityQuestions,
} from "@/features/security/security-content";
import { auth } from "@/lib/auth";
import { routes } from "@/shared/config/routes";
import "@/features/security-home/security-home.css";
import "./public-security-page.css";

export default function PublicSecurityPage() {
  const { setOpen: setArdiOpen } = useArdiAssistant();
  const hasWorkspace = auth.isAuthenticated();

  useEffect(() => {
    document.title = "Security | ARDI SEC";
  }, []);

  return (
    <div className="dark ardi-security-site ardi-security-page">
      <a className="ardi-v2-skip" href="#security-main">
        Skip to security
      </a>
      <SecurityHeader
        activeSection="security"
        onOpenAssistant={() => setArdiOpen(true)}
      />
      <main id="security-main">
        <section className="ardi-sec-hero" aria-labelledby="security-title">
          <div className="ardi-v2-shell ardi-sec-hero-grid">
            <div>
              <p className="ardi-v2-kicker">
                <i /> ARDI SEC / SECURITY
              </p>
              <h1 id="security-title">
                Authorised
                <br />
                by design.
              </h1>
              <p>
                A check starts after you confirm the target. Results stay on
                your account. The report is the record of what you tested and
                what came back.
              </p>
              <div className="ardi-sec-hero-actions">
                <a className="ardi-v2-button ardi-v2-button-primary" href="#permission">
                  Read the controls <ArrowRight />
                </a>
                <Link
                  href={hasWorkspace ? routes.dashboard : routes.register}
                  className="ardi-v2-button ardi-v2-button-chat"
                >
                  {hasWorkspace ? "Open workspace" : "Create a workspace"}{" "}
                  <ArrowRight />
                </Link>
              </div>
            </div>
            <ol className="ardi-sec-gate" aria-label="Order before a check">
              <li>
                <span>01</span>
                <b>Account</b>
                <small>Sign in</small>
              </li>
              <li>
                <span>02</span>
                <b>Permission</b>
                <small>Confirm the target</small>
              </li>
              <li>
                <span>03</span>
                <b>Check</b>
                <small>Start it yourself</small>
              </li>
              <li>
                <span>04</span>
                <b>Report</b>
                <small>Keep it on your account</small>
              </li>
            </ol>
          </div>
        </section>

        <nav className="ardi-sec-index" aria-label="Security topics">
          <div className="ardi-v2-shell">
            {securityControls.map((control) => (
              <a key={control.id} href={`#${control.id}`}>
                <span>{control.code}</span>
                {control.label}
              </a>
            ))}
          </div>
        </nav>

        <section className="ardi-sec-list" aria-label="Security controls">
          <div className="ardi-v2-shell">
            {securityControls.map((control) => (
              <article key={control.id} id={control.id}>
                <header>
                  <span>{control.code}</span>
                  <p>{control.label}</p>
                </header>
                <div>
                  <h2>{control.title}</h2>
                  <p>{control.summary}</p>
                </div>
                <ul>
                  {control.points.map((point) => (
                    <li key={point}>
                      <Check aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="ardi-sec-report" aria-labelledby="security-report-title">
          <div className="ardi-v2-shell">
            <p className="ardi-v2-kicker">
              <i /> THE RECORD
            </p>
            <h2 id="security-report-title">Hand someone the report.</h2>
            <p>
              When a customer, partner, or reviewer asks what you checked, open
              the report. It lists the target, the check, and the problems that
              came back.
            </p>
            <Link href={hasWorkspace ? routes.report : routes.register}>
              {hasWorkspace ? "Open reports" : "Create a workspace"}{" "}
              <ArrowRight />
            </Link>
          </div>
        </section>

        <section className="ardi-sec-faq" aria-labelledby="security-faq-title">
          <div className="ardi-v2-shell">
            <header>
              <p className="ardi-v2-kicker">
                <i /> QUESTIONS
              </p>
              <h2 id="security-faq-title">Straight answers.</h2>
            </header>
            <div>
              {securityQuestions.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SecurityFooter />
    </div>
  );
}
