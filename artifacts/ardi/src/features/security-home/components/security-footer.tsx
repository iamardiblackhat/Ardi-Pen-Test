import { Link } from 'wouter';
import { SecurityBrand } from '@/features/security-home/components/security-brand';
import { routes } from '@/shared/config/routes';

export function SecurityFooter() {
  return (
    <footer className="ardi-v2-footer">
      <div className="ardi-v2-shell ardi-v2-footer-grid">
        <div><SecurityBrand /><p>Authorised Pen Testing, evidence, OSINT, MITRE context, reporting, and ARDI-assisted security operations.</p></div>
        <div className="ardi-v2-footer-links">
          <nav aria-label="Product links"><a href="#pen-testing">Pen Testing</a><a href="#security-tools">Security tools</a><a href="#assistant">ARDI</a><Link href={routes.login}>Sign in</Link></nav>
          <nav aria-label="Legal and support links"><Link href={routes.terms}>Terms</Link><Link href={routes.privacy}>Privacy</Link><Link href={routes.cookies}>Cookies</Link><Link href={routes.faq}>FAQs</Link></nav>
        </div>
        <p>Authorised use only.<br />© {new Date().getFullYear()} ARDI SEC.</p>
      </div>
    </footer>
  );
}

