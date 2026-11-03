import {LoginForm} from '@/components/portal/LoginForm';
import '@/components/portal/login.css';

export const metadata = {title: 'Login · LiuGong Apps Portal'};

type Props = {searchParams: Promise<{next?: string; reason?: string; timeout?: string}>};

export default async function LoginPage({searchParams}: Props) {
  const {next, reason, timeout} = await searchParams;
  const notice = reason || (timeout ? 'Sesi Anda telah berakhir. Silakan login kembali.' : null);
  return <LoginForm next={next} notice={notice} />;
}
