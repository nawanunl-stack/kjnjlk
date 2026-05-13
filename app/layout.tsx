import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'ระบบทะเบียนกฎหมายความปลอดภัย',
  description: 'Safety Legal Registry System สำหรับเจ้าหน้าที่ความปลอดภัย (จป.)',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Sarabun, sans-serif' },
          }}
        />
      </body>
    </html>
  )
}
