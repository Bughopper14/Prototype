'use client';

import {useState, type FormEvent} from 'react';
import {AlertCircle, History, Loader2, Lock, LogIn, ShieldCheck, User} from 'lucide-react';

export function LoginForm({next, notice}: {next?: string; notice?: string | null}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: form.get('username'), password: form.get('password'), next}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login gagal');
      window.location.assign(data.redirect || '/gallery');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal');
      setBusy(false);
    }
  }

  return (
    <main className="lp">
      {/* eslint-disable @next/next/no-img-element */}
      {['lp-wm-1', 'lp-wm-2', 'lp-wm-3'].map(cls => (
        <div key={cls} className={`lp-watermark ${cls}`}>
          <img src="/img/logo.png" alt="" />
        </div>
      ))}

      <div className="lp-wrapper">
        <div className="lp-brand">
          <div className="lp-brand-logo">
            <img src="/img/logo.png" alt="LiuGong Finance Indonesia" />
          </div>
          <p className="lp-tagline">Internal Applications Portal</p>
        </div>

        <div className="lp-card">
          <div className="lp-topbar" />
          <div className="lp-body">
            <div className="lp-title">
              <div className="lp-badge">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h1>Selamat Datang</h1>
                <span>Masuk ke portal dengan akun Anda</span>
              </div>
            </div>
            <hr className="lp-divider" />

            {error ? (
              <div className="lp-alert error" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            ) : notice ? (
              <div className="lp-alert warn" role="alert">
                <History size={20} />
                <div>{notice}</div>
              </div>
            ) : null}

            <form method="post" action="/api/auth/login" onSubmit={submit}>
              {next && <input type="hidden" name="next" value={next} />}
              <label className="lp-label" htmlFor="username">
                Username
              </label>
              <div className="lp-group">
                <span className="lp-group-icon">
                  <User size={16} />
                </span>
                <input
                  id="username"
                  name="username"
                  placeholder="Masukkan username"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <label className="lp-label" htmlFor="password">
                Password
              </label>
              <div className="lp-group">
                <span className="lp-group-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button className="lp-submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={18} className="lp-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk ke Portal
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lp-accent">
            <Lock size={12} />
            <span>Koneksi Aman &bull; Liugong Finance Indonesia &copy; {new Date().getFullYear()}</span>
          </div>
        </div>

        <p className="lp-footer">
          Hanya untuk pengguna yang <b>berwenang</b>. Jika ada masalah, hubungi IT Admin.
        </p>
      </div>
    </main>
  );
}
