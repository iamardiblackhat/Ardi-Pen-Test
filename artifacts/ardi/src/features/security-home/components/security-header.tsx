import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { Link } from 'wouter';
import { primaryNavigation } from '@/features/security-home/security-home-content';
import { SecurityBrand } from '@/features/security-home/components/security-brand';
import { routes } from '@/shared/config/routes';

type Props = {
  activeSection: string;
  onOpenAssistant: () => void;
  onSelectSection: (section: string) => void;
};

export function SecurityHeader({ activeSection, onOpenAssistant, onSelectSection }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="ardi-v2-header">
      <div className="ardi-v2-shell ardi-v2-header-inner">
        <SecurityBrand onClick={closeMenu} />
        <nav className="ardi-v2-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => onSelectSection(item.id)}
              aria-current={activeSection === item.id ? 'location' : undefined}
            >
              {item.label}
            </a>
          ))}
          <Link href={routes.login}>Sign in</Link>
        </nav>
        <div className="ardi-v2-header-actions">
          <button type="button" className="ardi-v2-header-chat" onClick={onOpenAssistant}>Open ARDI</button>
          <a href="#pen-testing" className="ardi-v2-header-start">Start Pen Test <ArrowUpRight /></a>
          <button
            type="button"
            className="ardi-v2-menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="ardi-v2-mobile-nav" aria-label="Mobile navigation">
          <div className="ardi-v2-shell">
            {primaryNavigation.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={closeMenu}>{item.label} <ArrowRight /></a>
            ))}
            <button type="button" onClick={() => { closeMenu(); onOpenAssistant(); }}>Open ARDI <ArrowRight /></button>
            <Link href={routes.login} onClick={closeMenu}>Sign in <ArrowRight /></Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

