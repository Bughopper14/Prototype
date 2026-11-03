import type {Metadata, Viewport} from 'next';
import type {ReactNode} from 'react';

export const metadata: Metadata = {
  title: 'LiuGong Finance · Apps Portal',
  description: 'LiuGong Finance Indonesia internal applications portal',
  icons: {icon: '/img/logo_192.png'},
};

export const viewport: Viewport = {themeColor: '#1e40af'};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
