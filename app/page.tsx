import { LandingPage } from '@/components/landing/LandingPage';

// Check auth status and redirect if logged in
export default function Home() {
  // For now, always show landing page
  // In production, check session/cookie here
  return <LandingPage />;
}
