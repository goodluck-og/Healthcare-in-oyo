import React, { useEffect } from 'react';
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
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
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
import { syncPublicHealthLibraryToIndexedDb } from './services/offlineLibraryStore';
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
    route: '/ai-assistant',
    title: 'Hybrid AI & Accident Photo First Aid',
    subtitle:
      'Interactive follow-up questions in both Local & Cloud AI grounded in DOID/WHO/MedlinePlus, openFDA drug lookup, and emergency injury photo safety guidance.',
    cta: 'Open Hybrid AI',
    icon: Stethoscope,
    accent: 'text-[#8A8EF5]',
  },
  {
    route: '/monitoring',
    title: 'Smartwatch Vitals & GPS Auto-SOS',
    subtitle:
      'Pair Bluetooth heart-rate watches or run simulator tests with configurable critical thresholds, 15-second safety countdown, and GPS hospital routing.',
    cta: 'Open Watch & Vitals',
    icon: Activity,
    accent: 'text-[#FFB585]',
  },
  {
    route: '/dashboard',
    title: 'Age-Safe Personalised Dashboard',
    subtitle:
      'Adapts to children (0–12 Guardian Lock), teens, young adults, adults, and seniors — with multi-member profiles, vaccines, and clinical records.',
    cta: 'Open Dashboard',
    icon: CreditCard,
    accent: 'text-[#4FD1C5]',
  },
  {
    route: '/emergency',
    title: '24/7 Emergency & Offline Medical QR',
    subtitle:
      '1-tap direct emergency calling (112 / 911 / 999), nearest 24/7 hospital GPS routing, and offline Phone & Smartwatch Medical QR for first responders.',
    cta: 'Emergency & QR ID',
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
              HealthConnect · Universal Hybrid AI Healthcare
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Intelligent healthcare tailored to every age, device, and emergency
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#C7C8E6] max-w-md">
            Works online and offline as an installable PWA — combining verified medical knowledge,
            smartwatch GPS safety, offline Medical QR IDs, and clinical care pathways.
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

  useEffect(() => {
    void syncPublicHealthLibraryToIndexedDb();
  }, []);

  const isPublicRoute =
    route === '/' ||
    route === '/login' ||
    route === '/register' ||
    route === '/payment-response' ||
    route === '/ai-assistant' ||
    route === '/emergency' ||
    route === '/about';

  const renderPage = () => {
    if (!user.signedIn && !isPublicRoute) {
      if (authLoading) {
        return (
          <div className="min-h-[calc(100vh-4rem)] bg-[#0B0A33] flex items-center justify-center p-10 text-sm text-[#C7C8E6]">
            Checking your HealthConnect session...
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
      <OfflineIndicator />
      <main className="flex-1 pb-16 md:pb-0">{renderPage()}</main>
      <Footer />
      <MobileBottomNav />
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
