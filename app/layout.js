import './globals.css';

export const metadata = {
  title: 'Grab — search & save from YouTube',
  description: 'Search YouTube and save videos straight to your device.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
