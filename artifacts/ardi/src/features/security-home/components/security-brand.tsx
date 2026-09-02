import { Link } from 'wouter';
import { routes } from '@/shared/config/routes';

export function SecurityMark() {
  return <span className="ardi-v2-mark" aria-hidden="true"><i /><b /></span>;
}

export function SecurityBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href={routes.home} className="ardi-v2-brand" onClick={onClick} aria-label="ARDI SEC home">
      <SecurityMark />
      <span><b>ARDI SEC</b><small>AUTHORISED SECURITY PLATFORM</small></span>
    </Link>
  );
}

