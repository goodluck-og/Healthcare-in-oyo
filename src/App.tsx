import React from 'react';
import {
  Activity,
  ArrowRight,
  CreditCard,
  PhoneCall,
  Stethoscope,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/hero/HeroSection';
import { FindHealthcarePage } from './pages/FindHealthcarePage';
import { DashboardPage } from './pages/DashboardPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentResponsePage } from './pages/PaymentResponsePage';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import type { AppRoute } from './types/healthcare';

const DEDICATED_CARE_ROUTES: Array<{
  route: AppRoute;
  title: string;
  subtitle: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  {
    route: '/find-healthcare',
    title: 'Online Doctors First (Oyo State)',
    subtitle:
      'Consult verified Oyo State doctors online under your monthly plan, then decide together when to schedule a physical exam at UCH, Adeoyo, Ring Road, or Bowen.',
    cta: 'Talk to a Doctor',
    icon: Stethoscope,
    accent: 'text-[#8A8EF5]',
  },
  {
    route: '/payments',
    title: 'Individual (₦16k) & Family of 5 (₦50k)',
    subtitle:
      'One monthly subscription via Interswitch Web Redirect — Netflix-style profiles for up to 5 family members and transparent Payment History.',
    cta: 'View Plans & History',
    icon: CreditCard,
    accent: 'text-[#FFB585]',
  },
  {
    route: '/dashboard',
    title: 'Netflix-Style Family Dashboard',
    subtitle:
      'Switch between up to 5 private household profiles with blood group, genotype & sickle cell care, women’s health, and vaccines (0–5, 10–15, 15+).',
    cta: 'Open Dashboard',
    icon: Activity,
    accent: 'text-[#4FD1C5]',
  },
  {
    route: '/emergency',
    title: '24/7 Oyo Emergency Triage',
    subtitle:
      'Rapid ambulance handoff and trauma coordination across Ibadan, Ogbomoso, Oyo Town, Iseyin, Saki, and all 27 Oyo State towns.',
    cta: 'Emergency Desk',
    icon: PhoneCall,
    accent: 'text-[#FF8A8E]',
  },
];

function DedicatedCareDirectoryStrip() {
  const { navigate } = useApp();

  return (
    <section id="services" className="bg-[#0F0E47] border-t border-white/10 py-14 sm:py-16">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB585]">
              HealthConnect Oyo State · Connected Healthcare for Oyo State
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Simple subscription healthcare across every city in Oyo State
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#C7C8E6] max-w-md">
            Start online with a verified doctor, schedule physical exams only when needed, and pay
            one predictable monthly subscription through Interswitch Checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DEDICATED_CARE_ROUTES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className="group text-left rounded-2xl bg-[#13124A] hover:bg-[#1A1960] border border-white/10 p-6 flex flex-col justify-between space-y-5 transition-colors cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B0A33] border border-white/10 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${item.accent}`} />
                  </div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-[#C7C8E6] leading-relaxed">{item.subtitle}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFB585] group-hover:translate-x-0.5 transition-transform">
                  {item.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MainShell() {
  const { route, user, authLoading } = useApp();

  const isPublicRoute =
    route === '/' ||
    route === '/login' ||
    route === '/register' ||
    route === '/payment-response';

  const renderPage = () => {
    if (!user.signedIn && !isPublicRoute) {
      if (authLoading) {
        return (
          <div className="min-h-[calc(100vh-4rem)] bg-[#0B0A33] flex items-center justify-center p-10 text-sm text-[#C7C8E6]">
            Checking your HealthConnect Oyo State session...
          </div>
        );
      }
      return <AuthPage mode="login" gateRoute={route} />;
    }

    switch (route) {
      case '/find-healthcare':
        return <FindHealthcarePage />;
      case '/dashboard':
        return <DashboardPage />;
      case '/ai-assistant':
        return <AiAssistantPage />;
      case '/emergency':
        return <EmergencyPage />;
      case '/monitoring':
        return <MonitoringPage />;
      case '/payments':
        return <PaymentsPage />;
      case '/checkout':
        return <CheckoutPage />;
      case '/payment-response':
        return <PaymentResponsePage />;
      case '/about':
        return <AboutPage />;
      case '/login':
        return <AuthPage mode="login" />;
      case '/register':
        return <AuthPage mode="register" />;
      case '/':
      default:
        return (
          <>
            <HeroSection />
            <DedicatedCareDirectoryStrip />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0A33] text-[#0F0E47]">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
