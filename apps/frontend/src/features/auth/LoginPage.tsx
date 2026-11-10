import {usePageTitle} from '@/shared/lib/session';
import {useSearchParams} from 'react-router';
import {LoginForm} from './components/LoginForm';
import './login.css';

export default function LoginPage() {
  usePageTitle('Login · LiuGong Apps Portal');
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const notice =
    reason || (params.get('timeout') ? 'Sesi Anda telah berakhir. Silakan login kembali.' : null);
  return <LoginForm next={params.get('next') || undefined} notice={notice} />;
}
