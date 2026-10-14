import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { StepIndicator } from './components/BookingFlow/StepIndicator';
import { StepServices } from './components/BookingFlow/StepServices';
import { StepBarber } from './components/BookingFlow/StepBarber';
import { StepDateTime } from './components/BookingFlow/StepDateTime';
import { StepCustomer } from './components/BookingFlow/StepCustomer';
import { StepConfirmation } from './components/BookingFlow/StepConfirmation';
import { FloatingFooterSummary } from './components/BookingFlow/FloatingFooterSummary';
import { BookingSuccessModal } from './components/BookingFlow/BookingSuccessModal';
import { AdminScheduleView } from './components/AdminPanel/AdminScheduleView';
import { QuickTimeBlockModal } from './components/AdminPanel/QuickTimeBlockModal';
import { WebhookMonitorModal } from './components/AdminPanel/WebhookMonitorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QRCodeModal } from './components/QRCodeModal';

import {
  INITIAL_SERVICES,
  INITIAL_BARBERS,
  INITIAL_BOOKINGS,
  INITIAL_BLOCKS,
  DEFAULT_EVOLUTION_CONFIG,
  getTodayDateString,
} from './data/mockData';
import { Barber, Booking, BookingStatus, EvolutionApiConfig, Service, TimeBlock, WebhookLog } from './types';
import { addMinutesToTime, cleanPhone } from './utils/formatters';
import { calculateSlotAvailability } from './utils/doubleBooking';
import { dispatchEvolutionWebhook } from './services/webhookService';

function checkIsAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path.includes('/painel') ||
    path.includes('/admin') ||
    hash.includes('admin') ||
    hash.includes('painel') ||
    search.includes('admin')
  );
}

export default function App() {
  // Navigation View (auto-detects /painel/admin or /admin)
  const [currentView, setCurrentView] = useState<'client' | 'admin'>(() => {
    return checkIsAdminUrl() ? 'admin' : 'client';
  });

  // Sync with browser URL changes (popstate and hashchange)
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentView(checkIsAdminUrl() ? 'admin' : 'client');
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleNavigate = (view: 'client' | 'admin') => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const targetPath = view === 'admin' ? '/painel/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
  };

  // Booking Flow Steps (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Services State
  const [services] = useState<Service[]>(INITIAL_SERVICES);
  const [selectedServices, setSelectedServices] = useState<Service[]>([INITIAL_SERVICES[0]]);

  // Barbers State
  const [barbers] = useState<Barber[]>(INITIAL_BARBERS);
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    () => INITIAL_BARBERS[0]?.id || 'barber-leonardo'
  );

  // Date and Time State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>('14:00');

  // Customer Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState<boolean>(true);

  // Persistence: Bookings, Blocks, Webhook Logs, Config
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_bookings_v1');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_blocks_v1');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKS;
  });

  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionApiConfig>(() => {
    const saved = localStorage.getItem('barbearia_ls_evolution_config');
    return saved ? JSON.parse(saved) : DEFAULT_EVOLUTION_CONFIG;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_webhook_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('barbearia_ls_bookings_v1', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_blocks_v1', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_evolution_config', JSON.stringify(evolutionConfig));
  }, [evolutionConfig]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_webhook_logs', JSON.stringify(webhookLogs));
  }, [webhookLogs]);

  // Derived Totals
  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  const calculatedEndTime = useMemo(() => {
    if (!selectedTime) return '';
    return addMinutesToTime(selectedTime, totalDurationMinutes || 45);
  }, [selectedTime, totalDurationMinutes]);

  const resolvedBarber = useMemo(() => {
    if (selectedBarberId === 'any') {
      // Find the first barber available for this slot
      const availability = calculateSlotAvailability(
        selectedDate,
        selectedTime || '14:00',
        totalDurationMinutes || 45,
        'any',
        barbers,
        bookings,
        blocks
      );
      if (availability.availableBarberIds.length > 0) {
        return barbers.find((b) => b.id === availability.availableBarberIds[0]) || barbers[0];
      }
      return barbers[0];
    }
    return barbers.find((b) => b.id === selectedBarberId) || barbers[0];
  }, [selectedBarberId, selectedDate, selectedTime, totalDurationMinutes, barbers, bookings, blocks]);

  // Service toggle handler
  const handleToggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        // Keep at least 1 service
        if (prev.length === 1) return prev;
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // Step navigation rules
  const canProceedFromCurrentStep = useMemo(() => {
    if (currentStep === 1) return selectedServices.length > 0;
    if (currentStep === 2) return Boolean(selectedBarberId);
    if (currentStep === 3) return Boolean(selectedTime);
    if (currentStep === 4) {
      const cleanDigits = cleanPhone(customerPhone);
      return customerName.trim().length >= 2 && cleanDigits.length >= 10;
    }
    return true;
  }, [currentStep, selectedServices, selectedBarberId, selectedTime, customerName, customerPhone]);

  const handleNextStep = () => {
    if (!canProceedFromCurrentStep) return;
    setErrorMessage(null);
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (stepNumber: number) => {
    setErrorMessage(null);
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Booking Confirmation Handler
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // 1. Double-booking check to prevent race conditions
    const finalAvailability = calculateSlotAvailability(
      selectedDate,
      selectedTime,
      totalDurationMinutes,
      selectedBarberId,
      barbers,
      bookings,
      blocks
    );

    if (!finalAvailability.available) {
      setIsSubmitting(false);
      setErrorMessage(
        `Desculpe! O horário das ${selectedTime} acabou de ser reservado ou bloqueado. Por favor, selecione outro horário.`
      );
      setCurrentStep(3); // return to schedule picker
      return;
    }

    // Determine barber
    const assignedBarber =
      selectedBarberId === 'any'
        ? barbers.find((b) => b.id === finalAvailability.availableBarberIds[0]) || barbers[0]
        : barbers.find((b) => b.id === selectedBarberId) || barbers[0];

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerNotes: customerNotes.trim() || undefined,
      barberId: assignedBarber.id,
      barberName: assignedBarber.name,
      barberAvatar: assignedBarber.avatarUrl,
      services: selectedServices,
      date: selectedDate,
      startTime: selectedTime,
      endTime: calculatedEndTime,
      totalMinutes: totalDurationMinutes,
      totalPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notifyWhatsApp,
      reminderStatus: 'scheduled',
      webhookDispatched: true,
    };

    // 2. Dispatch Evolution API Webhook
    let newLog: WebhookLog | null = null;
    if (notifyWhatsApp) {
      try {
        newLog = await dispatchEvolutionWebhook('booking.created', newBooking, evolutionConfig);
        setWebhookLogs((prev) => [newLog!, ...prev]);
      } catch (err) {
        console.error('Webhook error:', err);
      }
    }

    // 3. Update bookings
    setBookings((prev) => [newBooking, ...prev]);
    setIsSubmitting(false);

    // 4. Open success modal
    setConfirmedBooking(newBooking);

    // Reset customer input for clean slate
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setCurrentStep(1);
  };

  // Admin Actions
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    // If cancelled, dispatch status change webhook
    if (newStatus === 'cancelled') {
      const log = await dispatchEvolutionWebhook(
        'booking.status_changed',
        { ...targetBooking, status: 'cancelled' },
        evolutionConfig
      );
      setWebhookLogs((prev) => [log, ...prev]);
    }
  };

  const handleAddBlock = (blockData: Omit<TimeBlock, 'id' | 'createdAt'>) => {
    const newBlock: TimeBlock = {
      ...blockData,
      id: `blk-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBlocks((prev) => [...prev, newBlock]);
    setIsBlockModalOpen(false);
  };

  const handleRemoveBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleTriggerTestReminder = async (booking: Booking) => {
    const log = await dispatchEvolutionWebhook('booking.reminder', booking, evolutionConfig);
    setWebhookLogs((prev) => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E4E4E7] flex flex-col selection:bg-[#D4AF37] selection:text-black w-full max-w-full overflow-x-hidden">
      <OfflineIndicator />

      {/* Top Header (Clean customer header or dedicated admin header) */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenWebhooks={() => setIsWebhookModalOpen(true)}
        onOpenQRCode={() => setIsQRCodeModalOpen(true)}
        webhookCount={webhookLogs.length}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto px-4 py-6 sm:py-8 space-y-6 transition-all duration-200 ${
        currentView === 'admin' ? 'max-w-7xl' : 'max-w-2xl sm:max-w-3xl'
      }`}>
        {currentView === 'client' ? (
          <div className="space-y-6">
            {/* Hero Atmosphere Banner (Only on Step 1) */}
            {currentStep === 1 && (
              <HeroBanner onOpenQRCode={() => setIsQRCodeModalOpen(true)} />
            )}

            {/* Step Progress Bar */}
            <div className="bg-[#18181B] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg">
              <StepIndicator
                currentStep={currentStep}
                onStepClick={handleGoToStep}
              />
            </div>

            {/* Error banner if double booking was detected on final submit */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* Step 1: Services */}
            {currentStep === 1 && (
              <StepServices
                services={services}
                selectedServiceIds={selectedServices.map((s) => s.id)}
                onToggleService={handleToggleService}
              />
            )}

            {/* Step 2: Barber Selection */}
            {currentStep === 2 && (
              <StepBarber
                barbers={barbers}
                selectedBarberId={selectedBarberId}
                onSelectBarber={setSelectedBarberId}
              />
            )}

            {/* Step 3: Date & Time */}
            {currentStep === 3 && (
              <StepDateTime
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                totalDurationMinutes={totalDurationMinutes}
                totalPrice={totalPrice}
                selectedBarberId={selectedBarberId}
                barbers={barbers}
                bookings={bookings}
                blocks={blocks}
                onSelectDate={setSelectedDate}
                onSelectTime={setSelectedTime}
              />
            )}

            {/* Step 4: Customer Details */}
            {currentStep === 4 && (
              <StepCustomer
                customerName={customerName}
                customerPhone={customerPhone}
                customerNotes={customerNotes}
                notifyWhatsApp={notifyWhatsApp}
                onChangeName={setCustomerName}
                onChangePhone={setCustomerPhone}
                onChangeNotes={setCustomerNotes}
                onToggleNotify={setNotifyWhatsApp}
              />
            )}

            {/* Step 5: Summary & Confirm */}
            {currentStep === 5 && (
              <StepConfirmation
                services={selectedServices}
                barber={resolvedBarber}
                isAnyBarber={selectedBarberId === 'any'}
                date={selectedDate}
                startTime={selectedTime}
                endTime={calculatedEndTime}
                totalDurationMinutes={totalDurationMinutes}
                totalPrice={totalPrice}
                customerName={customerName}
                customerPhone={customerPhone}
                customerNotes={customerNotes}
                isSubmitting={isSubmitting}
                onConfirm={handleConfirmBooking}
                onBackToStep={handleGoToStep}
              />
            )}

            {/* Natural Reach Zone Floating Footer (Mobile-first Thumb CTA) */}
            <div className="h-20 sm:h-24" />
            <FloatingFooterSummary
              currentStep={currentStep}
              totalSteps={5}
              selectedServicesCount={selectedServices.length}
              totalDurationMinutes={totalDurationMinutes}
              totalPrice={totalPrice}
              canProceed={canProceedFromCurrentStep}
              onNext={handleNextStep}
            />
          </div>
        ) : (
          /* Admin / Barber Panel */
          <AdminScheduleView
            barbers={barbers}
            bookings={bookings}
            blocks={blocks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onUpdateStatus={handleUpdateBookingStatus}
            onOpenBlockModal={() => setIsBlockModalOpen(true)}
          />
        )}
      </main>

      {/* Success Modal with WhatsApp direct trigger */}
      {confirmedBooking && (
        <BookingSuccessModal
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
          onOpenWebhooks={() => {
            setConfirmedBooking(null);
            setIsWebhookModalOpen(true);
          }}
        />
      )}

      {/* Quick Time Block Modal */}
      {isBlockModalOpen && (
        <QuickTimeBlockModal
          barbers={barbers}
          activeBlocks={blocks.filter((b) => b.date === selectedDate)}
          selectedDate={selectedDate}
          onClose={() => setIsBlockModalOpen(false)}
          onAddBlock={handleAddBlock}
          onRemoveBlock={handleRemoveBlock}
        />
      )}

      {/* Webhook & Evolution API Simulator Modal */}
      {isWebhookModalOpen && (
        <WebhookMonitorModal
          logs={webhookLogs}
          config={evolutionConfig}
          bookings={bookings}
          onClose={() => setIsWebhookModalOpen(false)}
          onUpdateConfig={setEvolutionConfig}
          onTriggerTestReminder={handleTriggerTestReminder}
          onClearLogs={() => setWebhookLogs([])}
        />
      )}

      {/* QR Code Modal for Instant Mobile Testing */}
      {isQRCodeModalOpen && (
        <QRCodeModal onClose={() => setIsQRCodeModalOpen(false)} />
      )}

      {/* Quiet Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-zinc-500 w-full overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-zinc-400">BARBEARIA LS</span>
            <span>·</span>
            <span>Agendamento Mobile Web</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-500 text-[11px]">
            <a
              href="/barbearia-ls-projeto.zip"
              download="barbearia-ls-projeto.zip"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 transition cursor-pointer font-medium"
              title="Baixar código-fonte em arquivo .ZIP"
            >
              <span>📦 Baixar Projeto (.ZIP)</span>
            </a>
            <span>·</span>
            {currentView === 'client' ? (
              <button
                onClick={() => handleNavigate('admin')}
                className="hover:text-amber-400 transition cursor-pointer underline text-zinc-500 hover:text-zinc-300"
              >
                Acesso do Barbeiro (/painel/admin)
              </button>
            ) : (
              <button
                onClick={() => handleNavigate('client')}
                className="hover:text-amber-400 transition cursor-pointer underline text-amber-400/80 hover:text-amber-300"
              >
                ← Voltar para Agendamento do Cliente
              </button>
            )}
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
