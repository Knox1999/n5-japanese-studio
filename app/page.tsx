import AccountGate from '@/components/AccountGate';
import StudioApp from '@/components/StudioApp';

export default function Home() {
  return <AccountGate><StudioApp /></AccountGate>;
}
