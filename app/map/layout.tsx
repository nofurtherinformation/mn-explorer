export const metadata = {
  title: 'Million Neighborhoods | Map',
  description: 'TBD',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
