import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Star,
  Check,
  ChevronLeft,
  Share2,
  Heart,
  Camera,
  Crown,
  LayoutGrid,
  Gem,
  Zap,
  ArrowRight,
  X,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sun,
  Sunrise,
  Moon,
  Shield,
  User,
  MessageSquare,
} from 'lucide-react';
import {
  Barber,
  Booking,
  CustomerProfile,
  Service,
  TenantConfig,
  TimeBlock,
  ClientSubscriptionPlan,
} from '../../types';
import { calculateSlotAvailability } from '../../utils/doubleBooking';
import { formatPhone, cleanDigits } from '../../utils/maskUtils';
import { getTodayDateString } from '../../data/mockData';
import { validateServiceForSubscriber } from '../../services/subscriptionValidator';
import { WhatsAppIcon } from '../WhatsAppIcon';

/** Navalha clássica de barbearia profissional (ícone bespoke para barba) */
const RazorBladeIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19l4.5-4.5" />
    <path d="M6.5 21.5l2-2" />
    <path d="M8.5 14.5l8-8a2.5 2.5 0 0 1 3.5 3.5l-8 8z" />
    <line x1="13" y1="9.5" x2="16.5" y2="13" />
  </svg>
);

interface NavilleLuxuryClientViewProps {
  tenantConfig: TenantConfig;
  services: Service[];
  barbers: Barber[];
  bookings: Booking[];
  blocks: TimeBlock[];
  customers: CustomerProfile[];
  clientPlans: ClientSubscriptionPlan[];
  onConfirmBooking: (bookingData: {
    services: Service[];
    barber: Barber;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    customerNotes?: string;
    totalPrice: number;
    totalMinutes: number;
  }) => Promise<void> | void;
  uiVersion: 'v1' | 'v2';
  onToggleUiVersion: (v: 'v1' | 'v2') => void;
  onNavigateToAdmin?: () => void;
  onNavigateToBarber?: () => void;
}

export const NavilleLuxuryClientView: React.FC<NavilleLuxuryClientViewProps> = ({
  tenantConfig,
  services,
  barbers,
  bookings,
  blocks,
  customers,
  clientPlans,
  onConfirmBooking,
  uiVersion,
  onToggleUiVersion,
  onNavigateToAdmin,
  onNavigateToBarber,
}) => {
  // Only active services and barbers
  const activeServices = useMemo(() => services.filter((s) => s.active !== false), [services]);
  const activeBarbers = useMemo(() => barbers.filter((b) => b.active !== false), [barbers]);

  // Client Selection State
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    return activeServices[0] ? [activeServices[0].id] : [];
  });
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>('14:00');

  // Customer Form State
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');

  // UI Interactive States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('naville_favorite_saved') === 'true';
    }
    return false;
  });
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historySearchPhone, setHistorySearchPhone] = useState<string>('');
  const [isClubModalOpen, setIsClubModalOpen] = useState<boolean>(false);

  // Ambience gallery photos
  const coverPhotos = [
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleToggleFavorite = () => {
    const next = !isFavorite;
    setIsFavorite(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('naville_favorite_saved', next ? 'true' : 'false');
    }
    showToast(next ? 'Salvo nos seus favoritos!' : 'Removido dos favoritos');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tenantConfig.name || 'Naville Heritage Barbershop',
          text: `Agende seu horário na ${tenantConfig.name || 'Naville'}!`,
          url: window.location.href,
        });
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link da barbearia copiado para a área de transferência!');
      } catch (_) {
        showToast('Compartilhe: ' + window.location.href);
      }
    }
  };

  // Detected Subscriber in Real-Time via Phone
  const detectedCustomer = useMemo(() => {
    const clean = cleanDigits(clientPhone);
    if (!clean || clean.length < 10) return null;
    return customers.find((c) => cleanDigits(c.phone) === clean) || null;
  }, [clientPhone, customers]);

  const activeCustomerPlan = useMemo(() => {
    if (!detectedCustomer || detectedCustomer.status_assinatura !== 'ativo') return null;
    return clientPlans.find((p) => p.id === detectedCustomer.plano_assinatura_id) || null;
  }, [detectedCustomer, clientPlans]);

  // Pré-preenchimento automático do nome caso o cliente já esteja cadastrado por este WhatsApp (documento)
  useEffect(() => {
    if (detectedCustomer && detectedCustomer.name && !clientName.trim()) {
      setClientName(detectedCustomer.name);
    }
  }, [detectedCustomer]);

  // Selected Services List & Aggregates
  // Selected Services List & Aggregates
  const selectedServices = useMemo(() => {
    return activeServices.filter((s) => selectedServiceIds.includes(s.id));
  }, [activeServices, selectedServiceIds]);

  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [selectedServices]);

  // Checagem se o profissional realiza os serviços selecionados
  const canBarberPerformServices = (barber: Barber, serviceList: Service[]) => {
    if (!barber.serviceIds || barber.serviceIds.length === 0) return true;
    return serviceList.every((svc) => barber.serviceIds!.includes(svc.id));
  };

  const getBarberMissingServices = (barber: Barber, serviceList: Service[]) => {
    if (!barber.serviceIds || barber.serviceIds.length === 0) return [];
    return serviceList.filter((svc) => !barber.serviceIds!.includes(svc.id));
  };

  // Profissional atualmente selecionado (ou melhor candidato para Primeiro Livre)
  const currentSelectedBarber = useMemo(() => {
    if (selectedBarberId === 'any') {
      return (
        activeBarbers.find(
          (b) =>
            b.attendanceType !== 'ordem_chegada' &&
            canBarberPerformServices(b, selectedServices)
        ) ||
        activeBarbers.find((b) => canBarberPerformServices(b, selectedServices)) ||
        activeBarbers[0] ||
        null
      );
    }
    return activeBarbers.find((b) => b.id === selectedBarberId) || null;
  }, [selectedBarberId, activeBarbers, selectedServices]);

  // Se o profissional selecionado atende exclusivamente por ordem de chegada (fila)
  const isOrdemChegadaOnly = useMemo(() => {
    if (selectedBarberId === 'any') return false;
    return currentSelectedBarber?.attendanceType === 'ordem_chegada';
  }, [selectedBarberId, currentSelectedBarber]);

  // Price Calculation with Subscriber Benefits (100% OFF for covered services)
  const priceCalculation = useMemo(() => {
    let rawTotal = 0;
    let effectiveTotal = 0;
    let subscriberCoveredCount = 0;
    let barberExcludedFromClub = false;

    if (
      detectedCustomer &&
      activeCustomerPlan &&
      currentSelectedBarber &&
      currentSelectedBarber.acceptsSubscriptionClub === false
    ) {
      barberExcludedFromClub = true;
    }

    selectedServices.forEach((service) => {
      rawTotal += service.price;
      if (detectedCustomer && activeCustomerPlan) {
        const val = validateServiceForSubscriber({
          customer: detectedCustomer,
          plan: activeCustomerPlan,
          service,
          barber: currentSelectedBarber,
          currentDate: selectedDate,
        });
        if (val.isCovered) {
          subscriberCoveredCount++;
          effectiveTotal += val.effectivePrice;
        } else {
          effectiveTotal += service.price;
        }
      } else {
        effectiveTotal += service.price;
      }
    });

    return {
      rawTotal,
      effectiveTotal,
      hasSubscriberDiscount: subscriberCoveredCount > 0,
      subscriberCoveredCount,
      barberExcludedFromClub,
    };
  }, [selectedServices, detectedCustomer, activeCustomerPlan, currentSelectedBarber, selectedDate]);

  // Next 14 Dynamic Days for Carousel
  const nextDays = useMemo(() => {
    const days = [];
    const baseDate = new Date();
    const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      days.push({
        dateString,
        dayOfWeek: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return days;
  }, []);

  // Standard Available Time Slots with Anti-Double-Booking Calculation
  const standardSlots = [
    '09:00', '09:45', '10:30', '11:15', '12:00',
    '13:30', '14:00', '14:45', '15:30', '16:15',
    '17:00', '17:45', '18:30', '19:15', '20:00',
  ];

  // Profissionais aptos a receber agendamento com hora marcada (capazes e não-exclusivos de fila)
  const eligibleBarbersForSlots = useMemo(() => {
    return activeBarbers.filter(
      (b) =>
        b.attendanceType !== 'ordem_chegada' &&
        canBarberPerformServices(b, selectedServices)
    );
  }, [activeBarbers, selectedServices]);

  const calculatedSlots = useMemo(() => {
    const duration = totalDurationMinutes > 0 ? totalDurationMinutes : 30;

    return standardSlots.map((timeStr) => {
      const availability = calculateSlotAvailability(
        selectedDate,
        timeStr,
        duration,
        selectedBarberId,
        eligibleBarbersForSlots,
        bookings,
        blocks
      );

      return {
        time: timeStr,
        available: availability.available,
        availableBarbersCount: availability.availableBarberIds.length,
      };
    });
  }, [selectedDate, totalDurationMinutes, selectedBarberId, eligibleBarbersForSlots, bookings, blocks]);

  // Filter slots by morning, afternoon, night or all
  const filteredSlots = useMemo(() => {
    return calculatedSlots.filter((slot) => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (selectedPeriod === 'morning') return hour < 12;
      if (selectedPeriod === 'afternoon') return hour >= 12 && hour < 18;
      if (selectedPeriod === 'night') return hour >= 18;
      return true;
    });
  }, [calculatedSlots, selectedPeriod]);

  // Automatically select first available slot if current selected slot becomes invalid
  useEffect(() => {
    const current = calculatedSlots.find((s) => s.time === selectedTime);
    if (!current || !current.available) {
      const firstAvailable = calculatedSlots.find((s) => s.available);
      if (firstAvailable) {
        setSelectedTime(firstAvailable.time);
      }
    }
  }, [calculatedSlots, selectedTime]);

  // Filter Services by category and search
  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCategory = true;
      if (selectedCategory === 'corte') {
        matchesCategory =
          s.category === 'cabelo' ||
          /corte|cabelo|fade/i.test(s.name);
      } else if (selectedCategory === 'barba') {
        matchesCategory =
          s.category === 'barba' ||
          /barba|toalha/i.test(s.name);
      } else if (selectedCategory === 'combo') {
        matchesCategory =
          s.category === 'combos' ||
          /combo|completo|\+/i.test(s.name);
      } else if (selectedCategory === 'tratamento') {
        matchesCategory =
          s.category === 'tratamento' ||
          /sobrancelha|limpeza|hidrata/i.test(s.name);
      }

      return matchesSearch && matchesCategory;
    });
  }, [activeServices, searchQuery, selectedCategory]);

  // Toggle Service selection
  const handleToggleService = (service: Service) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(service.id)) {
        if (prev.length === 1) {
          showToast('Mantenha ao menos 1 serviço selecionado.');
          return prev;
        }
        return prev.filter((id) => id !== service.id);
      } else {
        return [...prev, service.id];
      }
    });
  };

  // Formatação amigável da data selecionada
  const formattedBookingDate = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return selectedDate;
    const [year, month, day] = parts;
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `${capitalizedDay}, ${day}/${month}`;
  }, [selectedDate]);

  // Avançar para o Passo 2 (Modal VIP de Identificação & WhatsApp)
  const handleProceedToCheckout = () => {
    setErrorMessage(null);

    if (selectedServices.length === 0) {
      const msg = 'Por favor, selecione ao menos um serviço para continuar.';
      setErrorMessage(msg);
      showToast(msg);
      return;
    }

    let candidateBarber: Barber | undefined;
    if (selectedBarberId === 'any') {
      const slotAvail = calculateSlotAvailability(
        selectedDate,
        selectedTime,
        totalDurationMinutes || 30,
        'any',
        eligibleBarbersForSlots,
        bookings,
        blocks
      );
      candidateBarber = eligibleBarbersForSlots.find((b) => b.id === slotAvail.availableBarberIds[0]) || eligibleBarbersForSlots[0];
    } else {
      candidateBarber = barbers.find((b) => b.id === selectedBarberId) || activeBarbers[0];
    }

    if (!candidateBarber) {
      const msg = 'Nenhum profissional disponível no momento.';
      setErrorMessage(msg);
      showToast(msg);
      return;
    }

    if (!canBarberPerformServices(candidateBarber, selectedServices)) {
      const missing = getBarberMissingServices(candidateBarber, selectedServices);
      const msg = `O profissional ${candidateBarber.name} não realiza o serviço: ${missing.map((s) => s.name).join(', ')}. Por favor, selecione outro profissional.`;
      setErrorMessage(msg);
      showToast(msg);
      return;
    }

    const isWalkIn = candidateBarber.attendanceType === 'ordem_chegada';
    if (!isWalkIn && !selectedTime) {
      const msg = 'Por favor, selecione um horário disponível.';
      setErrorMessage(msg);
      showToast(msg);
      return;
    }

    setIsCheckoutModalOpen(true);
  };

  // Direct Booking Confirmation (Disparado no Passo 2)
  const handleBookNow = async () => {
    setErrorMessage(null);

    if (selectedServices.length === 0) {
      setErrorMessage('Por favor, selecione ao menos um serviço.');
      return;
    }

    if (!clientName.trim()) {
      setErrorMessage('Por favor, digite seu nome completo.');
      return;
    }

    const clean = cleanDigits(clientPhone);
    if (!clean || clean.length < 10) {
      setErrorMessage('Por favor, informe um WhatsApp válido com DDD (ex: 11 98765-4321).');
      return;
    }

    // Determine barber to assign
    let assignedBarber: Barber | undefined;
    if (selectedBarberId === 'any') {
      const slotAvail = calculateSlotAvailability(
        selectedDate,
        selectedTime,
        totalDurationMinutes || 30,
        'any',
        eligibleBarbersForSlots,
        bookings,
        blocks
      );
      assignedBarber = eligibleBarbersForSlots.find((b) => b.id === slotAvail.availableBarberIds[0]) || eligibleBarbersForSlots[0];
    } else {
      assignedBarber = barbers.find((b) => b.id === selectedBarberId) || activeBarbers[0];
    }

    if (!assignedBarber) {
      setErrorMessage('Nenhum profissional disponível para o horário selecionado.');
      return;
    }

    // Validação de Capacidade Técnica para os serviços selecionados
    if (!canBarberPerformServices(assignedBarber, selectedServices)) {
      const missing = getBarberMissingServices(assignedBarber, selectedServices);
      setErrorMessage(
        `O profissional ${assignedBarber.name} não realiza o serviço: ${missing.map((s) => s.name).join(', ')}. Por favor, selecione outro profissional.`
      );
      return;
    }

    const isWalkIn = assignedBarber.attendanceType === 'ordem_chegada';
    const bookingTime = isWalkIn ? 'Ordem de Chegada' : selectedTime;
    const notesWithQueue = isWalkIn
      ? `${clientNotes.trim() ? clientNotes.trim() + ' • ' : ''}[Atendimento por Ordem de Chegada / Fila Presencial]`
      : clientNotes.trim() || undefined;

    setIsSubmitting(true);
    try {
      await onConfirmBooking({
        services: selectedServices,
        barber: assignedBarber,
        date: selectedDate,
        time: bookingTime,
        customerName: clientName.trim(),
        customerPhone: formatPhone(clientPhone),
        customerNotes: notesWithQueue,
        totalPrice: priceCalculation.effectiveTotal,
        totalMinutes: totalDurationMinutes || 30,
      });

      if (isWalkIn) {
        showToast(`Vaga confirmada na fila com ${assignedBarber.name} para o dia ${selectedDate}!`);
      } else {
        showToast(`Agendamento realizado com sucesso para ${clientName}!`);
      }
      setIsCheckoutModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao confirmar agendamento. Tente outro horário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Past Bookings for Client History Lookup
  const customerHistoryList = useMemo(() => {
    const clean = cleanDigits(historySearchPhone || clientPhone);
    if (!clean || clean.length < 10) return [];
    return bookings
      .filter((b) => cleanDigits(b.customerPhone) === clean)
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [historySearchPhone, clientPhone, bookings]);

  return (
    <div className="w-full flex justify-center min-h-screen bg-[#0A0A0C] text-white font-sans antialiased selection:bg-[#D4A373] selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#16161A] border border-[#D4A373] text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-[#D4A373]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile-first viewport container with max-w-md and rich tablet/desktop stretch */}
      <div className="w-full max-w-md md:max-w-xl bg-[#0F0F11] min-h-screen flex flex-col relative pb-32 border-x border-[#2A2A32]/40 shadow-2xl">
        
        {/* ========================================================================= */}
        {/* TOP VERSION SWITCHER & CONTROL BAR */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-40 bg-[#0F0F11]/95 backdrop-blur-md border-b border-[#2A2A32]/60 px-4 py-2.5 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src="/naville_logo.png"
                alt="Naville"
                className="w-8 h-8 object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(212,163,115,0.4)]"
              />
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-[11px] uppercase font-bold text-[#E8C5A0] leading-none">
                  {tenantConfig.name || 'NAVILLE SUITE'}
                </span>
                <span className="text-[9px] text-[#8E8E98] mt-0.5">Luxury Experience</span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Agendamento Aberto
              </span>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* HERO COVER WITH ASYMMETRIC CURVED SCOOP OVERLAY */}
        {/* ========================================================================= */}
        <div
          className="relative w-full h-64 sm:h-72 overflow-hidden bg-black flex-shrink-0"
          style={{ clipPath: 'ellipse(115% 100% at 50% 100%)' }}
        >
          <img
            src={coverPhotos[coverIndex]}
            alt="Naville Ambience"
            className="w-full h-full object-cover object-center filter brightness-[0.85] transition-transform duration-700 hover:scale-105"
          />

          {/* Contrast Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] via-black/40 to-black/60" />

          {/* Top Floating Actions: Back, Favorite, Share */}
          <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between z-20">
            <button
              onClick={() => {
                setSelectedServiceIds(activeServices[0] ? [activeServices[0].id] : []);
                showToast('Seleção restaurada');
              }}
              title="Restaurar seleção inicial"
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-95 ${
                  isFavorite ? 'text-rose-400 bg-rose-500/20' : 'text-white hover:text-rose-400'
                }`}
                title="Favoritar Barbearia"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:text-[#D4A373] hover:bg-black/80 transition-all active:scale-95"
                title="Compartilhar Barbearia"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ambience Gallery Cycler */}
          <div className="absolute bottom-16 right-4 z-20">
            <button
              onClick={() => {
                setCoverIndex((prev) => (prev + 1) % coverPhotos.length);
                showToast('Foto do ambiente alternada');
              }}
              className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#D4A373]/40 text-[10px] text-[#E8C5A0] font-semibold flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ver Espaço</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ASYMMETRIC CURVED SHEET CUTOUT OVERLAY */}
        {/* ========================================================================= */}
        <div
          className="curved-sheet-cutout bg-[#0F0F12] z-10 px-5 pt-3 pb-2 border-t border-[#2A2A32]/30"
          style={{ marginTop: '-38px' }}
        >
          
          {/* Barbershop Identity, Logo Badge, Live Status & Rating */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              {/* Round Barbershop Crest / Logo with Gold Ring */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#261E14] to-[#141416] p-0.5 border-2 border-[#D4A373] shadow-lg flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-[#16161A] flex flex-col items-center justify-center text-[#D4A373]">
                    <Crown className="w-5 h-5" />
                    <span className="text-[8px] font-black tracking-widest uppercase mt-0.5">NVL</span>
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0F0F11] flex items-center justify-center" title="Aberto Agora">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>

              {/* Name, Category & Address */}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
                    {tenantConfig.name || 'Naville Heritage'}
                  </h1>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/30">
                    VIP CLUB
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E98] mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#D4A373]" />
                  <span>{tenantConfig.cidade || tenantConfig.address || 'Jardins, São Paulo • 1.2 km'}</span>
                </p>

                {/* Stars Rating and Reviews */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center text-amber-400 text-xs gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400/80" />
                  </div>
                  <span className="text-xs font-bold text-white">4.9</span>
                  <span className="text-[10px] text-[#8E8E98]">(380+ avaliações)</span>
                </div>
              </div>
            </div>

            {/* Quick History Check (No Password Needed) */}
            <button
              onClick={() => {
                setHistorySearchPhone(clientPhone);
                setIsHistoryModalOpen(true);
              }}
              title="Consultar Meus Cortes & Agendamentos"
              className="flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-[#16161A] border border-[#2A2A32] text-[#D4A373] hover:border-[#D4A373]/60 active:scale-95 transition-all shadow-sm"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* Operating Hours Pill & Fast Actions */}
          <div className="mt-3.5 p-2.5 rounded-2xl bg-[#16161A] border border-[#2A2A32] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-bold text-emerald-400 block leading-none">
                  Aberto hoje até 20:30
                </span>
                <span className="text-[10px] text-[#8E8E98] block mt-0.5 truncate">
                  Segunda a Sábado • 09:00 às 20:30
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a
                href={`https://wa.me/55${cleanDigits(tenantConfig.ownerPhone || '11981234567')}?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20${encodeURIComponent(tenantConfig.name || 'Barbearia')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-500/25 transition-all"
              >
                <WhatsAppIcon variant="official" size={13} />
                <span>Zap</span>
              </a>

              <button
                onClick={() => {
                  const addr = tenantConfig.address || 'Av. Paulista, 1000 - Jardins, São Paulo';
                  window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank');
                }}
                className="p-1.5 rounded-xl bg-[#0F0F11] border border-[#2A2A32] text-[#8E8E98] hover:text-white transition-all"
                title="Abrir no Google Maps"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="px-5 pt-2 pb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-[#8E8E98]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar corte, barba, combo ou serviço..."
              className="w-full bg-[#16161A] text-xs text-white pl-10 pr-4 py-2.5 rounded-2xl border border-[#2A2A32] focus:border-[#D4A373] outline-none transition-all placeholder:text-[#8E8E98]/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[#8E8E98] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONFIGURABLE PROMOTIONAL CAROUSEL (Clube VIP & Ofertas) */}
        {/* ========================================================================= */}
        <div className="pt-1 pb-1">
          <div className="relative overflow-hidden px-5">
            <div
              className="flex transition-transform duration-500 ease-out rounded-2xl overflow-hidden card-border-gradient relative"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {/* Slide 1: Combo Destaque */}
              <div className="w-full flex-shrink-0 bg-gradient-to-br from-[#241A12] via-[#1A1817] to-[#16161A] p-4 relative flex items-center justify-between min-h-[135px]">
                <div className="relative z-10 max-w-[62%]">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/30">
                    Destaque da Semana
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                    Cabelo + Barba Terapia
                  </h3>
                  <p className="text-[11px] text-[#8E8E98] mt-1">
                    Toalha quente, alinhamento simétrico e finalização.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#D4A373]">
                      R$ {activeServices.find((s) => s.category === 'combos')?.price || 70},00
                    </span>
                    <button
                      onClick={() => {
                        const combo = activeServices.find((s) => s.category === 'combos') || activeServices[0];
                        if (combo) {
                          setSelectedServiceIds([combo.id]);
                          showToast(`Selecionado: ${combo.name}`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#D4A373] text-[#0F0F11] text-[10px] font-bold hover:brightness-110 active:scale-95 transition-all"
                    >
                      Selecionar
                    </button>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#2A2A32] flex-shrink-0 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80"
                    alt="Corte e Barba"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Slide 2: Naville Club VIP (Clube de Assinaturas) */}
              <div className="w-full flex-shrink-0 bg-gradient-to-br from-[#1C1A24] via-[#16161C] to-[#16161A] p-4 relative flex items-center justify-between min-h-[135px]">
                <div className="relative z-10 max-w-[65%]">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Naville Club VIP
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                    {clientPlans[0]?.nome || 'Cortes Ilimitados por Mês'}
                  </h3>
                  <p className="text-[11px] text-[#8E8E98] mt-1">
                    {clientPlans[0]?.permite_barba ? 'Inclui Barba Terapia' : 'Sem filas, cobrança mensal fixa.'}
                  </p>
                  <button
                    onClick={() => setIsClubModalOpen(true)}
                    className="mt-2.5 px-3 py-1 rounded-lg bg-[#D4A373]/20 border border-[#D4A373]/40 text-[#D4A373] text-[10px] font-bold hover:bg-[#D4A373]/30 transition-all flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3" />
                    <span>Conhecer Clube (R$ {clientPlans[0]?.valor_mensal || 89}/mês)</span>
                  </button>
                </div>
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#2A2A32] flex-shrink-0 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80"
                    alt="Barbearia VIP"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-1.5 mt-2">
              <button
                onClick={() => setActiveSlide(0)}
                className={`h-1.5 rounded-full transition-all ${activeSlide === 0 ? 'w-5 bg-[#D4A373]' : 'w-2 bg-[#2A2A32]'}`}
              />
              <button
                onClick={() => setActiveSlide(1)}
                className={`h-1.5 rounded-full transition-all ${activeSlide === 1 ? 'w-5 bg-[#D4A373]' : 'w-2 bg-[#2A2A32]'}`}
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CATEGORIES PILLS */}
        {/* ========================================================================= */}
        <div className="px-5 pt-2 pb-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'todos', label: 'Todos', icon: LayoutGrid },
              { id: 'corte', label: 'Cabelo', icon: Scissors },
              { id: 'barba', label: 'Barba', icon: RazorBladeIcon },
              { id: 'combo', label: 'Combos VIP', icon: Crown },
              { id: 'tratamento', label: 'Estética', icon: Gem },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                    isActive
                      ? 'bg-[#D4A373] text-[#0F0F11]'
                      : 'bg-[#16161A] text-[#8E8E98] border border-[#2A2A32] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. SELEÇÃO DE SERVIÇOS (LUXURY CARDS) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8E8E98]">
              1. Selecione o Serviço ({selectedServices.length})
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-[#D4A373] font-semibold">
              <Clock className="w-3 h-3 text-[#D4A373]" />
              <span>{totalDurationMinutes} min total</span>
              {totalDurationMinutes > 30 && (
                <span className="px-2 py-0.5 rounded-full bg-[#D4A373]/20 text-[#E8C5A0] text-[10px] font-bold border border-[#D4A373]/30">
                  {Math.ceil(totalDurationMinutes / 30)} horários
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);

              // Check if covered by subscription
              let isCoveredBySub = false;
              let isBarberExcluded = false;
              if (detectedCustomer && activeCustomerPlan) {
                const subVal = validateServiceForSubscriber({
                  customer: detectedCustomer,
                  plan: activeCustomerPlan,
                  service,
                  barber: currentSelectedBarber,
                  currentDate: selectedDate,
                });
                isCoveredBySub = subVal.isCovered;
                if (!subVal.isCovered && currentSelectedBarber && currentSelectedBarber.acceptsSubscriptionClub === false) {
                  isBarberExcluded = true;
                }
              }

              return (
                <div
                  key={service.id}
                  onClick={() => handleToggleService(service)}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between group active:scale-[0.99] ${
                    isSelected
                      ? 'border-[#D4A373] bg-[#1F1D24] shadow-md'
                      : 'border-[#2A2A32] bg-[#16161A] hover:border-[#D4A373]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center text-lg overflow-hidden shrink-0 transition-transform group-hover:scale-105 shadow-sm relative ${
                        isSelected
                          ? 'border-[#D4A373] bg-[#D4A373]/20 text-[#D4A373]'
                          : 'border-[#2A2A32] bg-[#0F0F11] text-[#D4A373]'
                      }`}
                    >
                      {service.imageUrl ? (
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : service.category === 'combos' ? (
                        <Crown className="w-5 h-5" />
                      ) : service.category === 'barba' ? (
                        <RazorBladeIcon className="w-5 h-5" />
                      ) : service.category === 'tratamento' ? (
                        <Gem className="w-5 h-5" />
                      ) : (
                        <Scissors className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`text-xs font-bold transition-colors ${
                            isSelected ? 'text-[#D4A373]' : 'text-white group-hover:text-[#D4A373]'
                          }`}
                        >
                          {service.name}
                        </h4>
                        {isCoveredBySub && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            100% OFF · Clube VIP
                          </span>
                        )}
                        {isBarberExcluded && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 border border-white/10" title="Este barbeiro atende apenas avulso">
                            Avulso c/ {currentSelectedBarber?.nickname || 'Barbeiro'}
                          </span>
                        )}
                        {service.durationMinutes >= 60 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {Math.ceil(service.durationMinutes / 30)} Horários
                          </span>
                        )}
                        {service.popular && !isCoveredBySub && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#D4A373]/20 text-[#D4A373]">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E8E98] mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[10px]" /> {service.durationMinutes} min
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                          {service.description || 'Acabamento de precisão'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {isCoveredBySub ? (
                      <div>
                        <span className="text-xs line-through text-[#8E8E98] block">
                          R$ {service.price.toFixed(0)}
                        </span>
                        <span className="text-sm font-extrabold text-purple-300">R$ 0,00</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[#D4A373]">
                        R$ {service.price.toFixed(0)}
                      </span>
                    )}

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ml-auto transition-colors ${
                        isSelected ? 'border-[#D4A373] bg-[#D4A373]/20' : 'border-[#2A2A32]'
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#D4A373]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. ESCOLHA DO PROFISSIONAL (AVATARES COM AURA DOURADA & MODALIDADES) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8E8E98]">
              2. Escolha o Profissional
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#D4A373] font-semibold">
                {selectedBarberId === 'any'
                  ? 'Primeiro Livre'
                  : currentSelectedBarber?.name || 'Selecionado'}
              </span>
              {currentSelectedBarber?.attendanceType === 'ordem_chegada' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Ordem de Chegada
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {/* Anyone / Faster Option */}
            <div
              onClick={() => {
                const capableCount = activeBarbers.filter(
                  (b) =>
                    b.attendanceType !== 'ordem_chegada' &&
                    canBarberPerformServices(b, selectedServices)
                ).length;
                if (capableCount === 0) {
                  showToast('Nenhum profissional com agenda livre realiza todos os serviços selecionados.');
                  return;
                }
                setSelectedBarberId('any');
                showToast('Barbeiro: Primeiro Livre selecionado');
              }}
              className="flex-shrink-0 flex flex-col items-center cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-full border-2 p-0.5 relative transition-transform group-hover:scale-105 ${
                  selectedBarberId === 'any' ? 'border-[#D4A373]' : 'border-transparent'
                }`}
              >
                <div className="w-full h-full rounded-full bg-[#16161A] flex items-center justify-center text-[#D4A373]">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-white mt-1.5 text-center">
                Primeiro Livre
              </span>
              <span className="text-[9px] text-[#8E8E98]">Mais rápido</span>
            </div>

            {/* Active Barbers Avatars with Capability & Attendance Badges */}
            {activeBarbers.map((barber) => {
              const isSelected = selectedBarberId === barber.id;
              const canPerform = canBarberPerformServices(barber, selectedServices);
              const missingServices = getBarberMissingServices(barber, selectedServices);

              return (
                <div
                  key={barber.id}
                  onClick={() => {
                    if (!canPerform) {
                      showToast(
                        `⚠️ ${barber.name} não realiza: ${missingServices.map((s) => s.name).join(', ')}.`
                      );
                      return;
                    }
                    setSelectedBarberId(barber.id);
                    if (barber.attendanceType === 'ordem_chegada') {
                      showToast(`${barber.name} selecionado (Atendimento por Ordem de Chegada)`);
                    } else if (barber.acceptsSubscriptionClub === false && detectedCustomer && activeCustomerPlan) {
                      showToast(`${barber.name} selecionado (Serviço Avulso Particular)`);
                    } else {
                      showToast(`Barbeiro selecionado: ${barber.name}`);
                    }
                  }}
                  className={`flex-shrink-0 flex flex-col items-center cursor-pointer group transition-opacity ${
                    !canPerform ? 'opacity-40 hover:opacity-75' : ''
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-full border-2 p-0.5 relative transition-transform group-hover:scale-105 ${
                      isSelected ? 'border-[#D4A373]' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={
                        barber.avatarUrl ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={barber.name}
                      className={`w-full h-full rounded-full object-cover ${!canPerform ? 'grayscale-[0.7]' : ''}`}
                    />

                    {/* Badge de Modalidade (Fila vs Agenda vs Ambos) */}
                    {barber.attendanceType === 'ordem_chegada' ? (
                      <span
                        className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[8px] font-bold shadow-sm"
                        title="Atende apenas por ordem de chegada no balcão"
                      >
                        Fila
                      </span>
                    ) : barber.attendanceType === 'ambos' ? (
                      <span
                        className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[8px] font-bold shadow-sm"
                        title="Atende com hora marcada e ordem de chegada"
                      >
                        ⚡ Ambos
                      </span>
                    ) : (
                      <span
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0F0F11]"
                        title="Disponível para agendamento online"
                      />
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-white mt-1.5 text-center truncate max-w-[70px]">
                    {barber.nickname || barber.name.split(' ')[0]}
                  </span>

                  {/* Indicador de Capacidade / Especialidade ou Nota */}
                  {!canPerform ? (
                    <span className="text-[8px] font-bold text-rose-400 truncate max-w-[70px]">
                      Não faz {missingServices[0]?.name.split(' ')[0]}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[#D4A373] flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-[#D4A373]" /> {barber.rating || '4.9'}
                      </span>
                      {barber.acceptsSubscriptionClub === false && (
                        <span className="text-[8px] font-bold px-1 rounded bg-zinc-800 text-zinc-400 border border-white/5" title="Atende exclusivamente serviços avulsos">
                          Avulso
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Alerta Contextual: Barbeiro que não aceita o Clube VIP */}
          {currentSelectedBarber?.acceptsSubscriptionClub === false && detectedCustomer && activeCustomerPlan && (
            <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block">
                  Aviso: Atendimento Avulso Particular
                </span>
                <span className="text-[11px] text-amber-200/90 block">
                  O profissional <strong>{currentSelectedBarber.name}</strong> atende exclusivamente como serviço avulso (não incluso na cota do Clube VIP).
                </span>
              </div>
            </div>
          )}

          {/* Alerta Contextual: Barbeiro não realiza serviços selecionados */}
          {currentSelectedBarber && !canBarberPerformServices(currentSelectedBarber, selectedServices) && (
            <div className="mt-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-300 block">
                  Serviço não realizado por este profissional
                </span>
                <span className="text-[11px] text-rose-200/90 block">
                  {currentSelectedBarber.name} não realiza:{' '}
                  <strong>{getBarberMissingServices(currentSelectedBarber, selectedServices).map((s) => s.name).join(', ')}</strong>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. CAIXA VIP DE SELEÇÃO: ORDEM DE CHEGADA VS AGENDA COM HORA MARCADA */}
        {/* ========================================================================= */}
        {isOrdemChegadaOnly ? (
          /* =================== MODO FILA / ORDEM DE CHEGADA =================== */
          <div className="mx-4 sm:mx-5 my-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#121824] via-[#16161A] to-[#0D1117] border border-blue-500/30 relative overflow-hidden shadow-xl animate-in fade-in duration-200">
            {/* Ambient Corner Flare */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Box Header */}
            <div className="flex items-center justify-between gap-2 mb-3.5 pb-3 border-b border-blue-500/20 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>3. Atendimento por Ordem de Chegada</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-inter">
                    {currentSelectedBarber?.name} atende exclusivamente na fila presencial do balcão
                  </p>
                </div>
              </div>

              {/* Live Badge */}
              <div className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-poppins font-bold flex items-center gap-1.5 shadow-sm shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Fila Presencial</span>
              </div>
            </div>

            {/* Subheader: Escolha o Dia */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-poppins font-semibold uppercase tracking-wider text-zinc-300">
                Escolha o Dia do Atendimento
              </span>
              <span className="text-[10px] text-blue-400 font-inter font-medium">
                Válido para o dia selecionado
              </span>
            </div>

            {/* Date Horizontal Strip with 3D Luxury Day Cards */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {nextDays.map((d) => {
                const isSelected = selectedDate === d.dateString;
                return (
                  <button
                    key={d.dateString}
                    onClick={() => {
                      setSelectedDate(d.dateString);
                      showToast(`Dia da visita: ${d.dateString}`);
                    }}
                    className={`flex-shrink-0 w-14 py-2.5 rounded-2xl font-poppins flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                        : 'bg-[#141418] border border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`text-[9px] uppercase font-poppins font-extrabold tracking-widest ${
                        isSelected ? 'text-white' : 'text-zinc-500'
                      }`}
                    >
                      {d.isToday ? 'HOJE' : d.dayOfWeek}
                    </span>
                    <span
                      className={`text-base font-poppins font-extrabold leading-none mt-1 ${
                        isSelected ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                    {isSelected && (
                      <span className="w-1 h-1 rounded-full bg-white mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Queue Status Live Panel */}
            <div className="mt-4 p-3.5 rounded-2xl bg-black/40 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-blue-400">🚶</span>
                  <span>Fila Aberta no Balcão</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Tempo médio: ~15 a 20 min
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Sem necessidade de marcar horário fixo. Ao confirmar sua vaga, compareça à barbearia no dia escolhido ({selectedDate === getTodayDateString() ? 'Hoje' : selectedDate}) e informe seu nome ou WhatsApp no balcão.
              </p>
            </div>

            {/* Reassurance Footer Strip */}
            <div className="mt-3 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-zinc-400 font-inter">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Atendimento presencial garantido no balcão</span>
              </div>
              <span className="text-blue-400 font-poppins font-bold text-[10px]">
                Fila Rápida
              </span>
            </div>
          </div>
        ) : (
          /* =================== MODO AGENDA DE HORÁRIOS (OU HÍBRIDO) =================== */
          <div className="mx-4 sm:mx-5 my-4 p-4 sm:p-5 rounded-3xl luxury-box-gradient relative overflow-hidden">
            {/* Ambient Corner Flare */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D4A373]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Box Header */}
            <div className="flex items-center justify-between gap-2 mb-3.5 pb-3 border-b border-[#2A2A32]/60 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#D4A373]/25 via-[#D4A373]/10 to-transparent border border-[#D4A373]/40 flex items-center justify-center text-[#D4A373] shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-white">
                    3. Data & Horário
                  </h3>
                  <p className="text-[10px] text-[#8E8E98] font-inter">
                    {currentSelectedBarber?.attendanceType === 'ambos'
                      ? 'Escolha seu horário ou compareça direto por ordem de chegada'
                      : 'Selecione o momento ideal para o seu atendimento'}
                    {totalDurationMinutes > 30 && (
                      <span className="text-[#E8C5A0] font-medium ml-1">
                        • {totalDurationMinutes} min ({Math.ceil(totalDurationMinutes / 30)} horários contíguos)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Live Active Selection Capsule */}
              <div className="px-2.5 py-1 rounded-xl bg-[#D4A373]/15 border border-[#D4A373]/35 text-[#D4A373] text-[10px] font-poppins font-bold flex items-center gap-1.5 shadow-sm shrink-0">
                <Clock className="w-3 h-3 text-[#D4A373]" />
                <span>{selectedTime}</span>
              </div>
            </div>

            {/* Subheader: Seleção do Dia */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-poppins font-semibold uppercase tracking-wider text-zinc-300">
                Escolha a Data
              </span>
              <span className="text-[10px] text-[#D4A373] font-inter font-medium">
                Próximos 14 dias liberados
              </span>
            </div>

            {/* Date Horizontal Strip with 3D Luxury Day Cards */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {nextDays.map((d) => {
                const isSelected = selectedDate === d.dateString;
                return (
                  <button
                    key={d.dateString}
                    onClick={() => {
                      setSelectedDate(d.dateString);
                      showToast(`Data selecionada: ${d.dateString}`);
                    }}
                    className={`flex-shrink-0 w-14 py-2.5 rounded-2xl font-poppins flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'luxury-chip-active scale-[1.02]'
                        : 'luxury-chip-idle'
                    }`}
                  >
                    <span
                      className={`text-[9px] uppercase font-poppins font-extrabold tracking-widest ${
                        isSelected ? 'text-[#0F0F11]' : 'text-[#8E8E98]'
                      }`}
                    >
                      {d.isToday ? 'HOJE' : d.dayOfWeek}
                    </span>
                    <span
                      className={`text-base font-poppins font-extrabold leading-none mt-1 ${
                        isSelected ? 'text-[#0F0F11]' : 'text-white'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                    {isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#0F0F11] mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Period Concierge Filter (Manhã, Tarde, Noite, Todos) */}
            <div className="mt-4 pt-3 border-t border-[#2A2A32]/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-poppins font-semibold uppercase tracking-wider text-zinc-300">
                  Horários Disponíveis
                </span>
                <span className="text-[10px] text-emerald-400 font-inter font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sem fila de espera
                </span>
              </div>

              {/* Segmented Filter Pills */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#100F15] rounded-xl border border-[#2A2A32]/80 mb-3">
                {[
                  { id: 'all', label: 'Todos', icon: LayoutGrid },
                  { id: 'morning', label: 'Manhã', icon: Sunrise },
                  { id: 'afternoon', label: 'Tarde', icon: Sun },
                  { id: 'night', label: 'Noite', icon: Moon },
                ].map((p) => {
                  const Icon = p.icon;
                  const active = selectedPeriod === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPeriod(p.id as any)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-poppins font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#D4A373] text-[#0F0F11] shadow-sm'
                          : 'text-[#8E8E98] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots Grid (Luxury Cards with status badge) */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {filteredSlots.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-[#8E8E98] text-xs font-inter">
                    Nenhum horário disponível para este período.
                  </div>
                ) : (
                  filteredSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          showToast(`Horário selecionado: ${slot.time}`);
                        }}
                        className={`relative p-2 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
                          !slot.available
                            ? 'bg-[#141418]/40 border border-[#2A2A32]/30 text-[#8E8E98]/30 cursor-not-allowed line-through'
                            : isSelected
                            ? 'luxury-chip-active scale-[1.03] ring-2 ring-[#D4A373]'
                            : 'luxury-chip-idle'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-poppins font-extrabold text-xs sm:text-sm tracking-wide">
                            {slot.time}
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-[#0F0F11]" />}
                        </div>
                        <span
                          className={`text-[8px] uppercase tracking-wider font-poppins font-bold mt-0.5 ${
                            isSelected
                              ? 'text-[#0F0F11]/80'
                              : !slot.available
                              ? 'text-zinc-600'
                              : 'text-[#D4A373]'
                          }`}
                        >
                          {!slot.available ? 'Ocupado' : isSelected ? 'Escolhido' : 'Livre'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Reassurance Footer Strip inside the Box */}
            <div className="mt-4 pt-3 border-t border-[#2A2A32]/60 flex items-center justify-between text-[11px] text-[#8E8E98] font-inter">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#D4A373]" />
                <span>
                  Reserva de <strong className="text-white font-poppins">{totalDurationMinutes || 30} min</strong>
                  {totalDurationMinutes > 30 && (
                    <span className="text-[#E8C5A0] font-medium ml-1">
                      ({Math.ceil(totalDurationMinutes / 30)} horários contíguos na agenda)
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[#E8C5A0] font-poppins font-bold text-[10px]">
                Pontualidade VIP
              </span>
            </div>
          </div>
        )}

        {/* Validation Error Banner (se houver erro antes de abrir modal) */}
        {errorMessage && !isCheckoutModalOpen && (
          <div className="mx-5 my-3 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FIXED LUXURY CHECKOUT BAR */}
        {/* ========================================================================= */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-xl mx-auto bg-[#121216]/95 backdrop-blur-md border-t border-[#2A2A32] p-4 z-40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E98]">
                Total a pagar
              </span>
              <span className="text-[10px] text-[#D4A373] font-medium">
                • {totalDurationMinutes || 30} min ({Math.ceil((totalDurationMinutes || 30) / 30)} {Math.ceil((totalDurationMinutes || 30) / 30) === 1 ? 'horário' : 'horários'})
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white">
                R$ {priceCalculation.effectiveTotal.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[10px] text-[#8E8E98]">
                {priceCalculation.barberExcludedFromClub
                  ? `(Avulso c/ ${currentSelectedBarber?.nickname || 'Barbeiro'})`
                  : priceCalculation.hasSubscriberDiscount
                  ? '(Clube VIP 100% OFF)'
                  : isOrdemChegadaOnly
                  ? '(na chegada)'
                  : '(no balcão)'}
              </span>
            </div>
          </div>

          <button
            onClick={handleProceedToCheckout}
            className={`px-6 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 gold-glow transition-all active:scale-95 ${
              isOrdemChegadaOnly
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:brightness-110 shadow-lg shadow-blue-500/30'
                : 'bg-gradient-to-r from-[#D4A373] to-[#B88656] text-[#0F0F11] hover:brightness-110'
            }`}
          >
            <span>
              {isOrdemChegadaOnly
                ? 'Avançar (Fila Presencial)'
                : 'Continuar para Agendar'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PASSO 2: MODAL VIP DE IDENTIFICAÇÃO & CONFIRMAÇÃO NO WHATSAPP */}
        {/* ========================================================================= */}
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A32] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-[#D4A373]/15 border border-[#D4A373]/40 text-[#D4A373] text-[10px] font-bold uppercase tracking-wider">
                    Passo 2 de 2
                  </div>
                  <h3 className="text-sm font-bold text-white">Finalizar Agendamento</h3>
                </div>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#0F0F11] text-[#8E8E98] hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Resumo do Atendimento Escolhido */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#0F0F11] border border-[#2A2A32]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E98]">
                    Resumo do Agendamento
                  </span>
                  <span className="text-[11px] font-semibold text-[#D4A373]">
                    {totalDurationMinutes || 30} min ({Math.ceil((totalDurationMinutes || 30) / 30)} {Math.ceil((totalDurationMinutes || 30) / 30) === 1 ? 'horário' : 'horários'})
                  </span>
                </div>

                {/* Professional & Time */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={currentSelectedBarber?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={currentSelectedBarber?.name}
                      className="w-9 h-9 rounded-xl object-cover border border-[#D4A373]/40"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{selectedBarberId === 'any' ? 'Primeiro Livre' : currentSelectedBarber?.name}</span>
                        {isOrdemChegadaOnly ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
                            Ordem de Chegada
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                            Horário Marcado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8E8E98] flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-[#D4A373]" />
                        <span>{formattedBookingDate}</span>
                        {!isOrdemChegadaOnly && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3 text-[#D4A373]" />
                            <span className="text-white font-semibold">{selectedTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Services Tags */}
                <div className="pt-2 border-t border-[#2A2A32]/60">
                  <div className="text-[10px] text-[#8E8E98] font-medium mb-1.5">Serviços inclusos:</div>
                  <div className="space-y-1.5">
                    {selectedServices.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#E0E0E6] flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-[#D4A373]" />
                          {svc.name}
                        </span>
                        <span className="text-white font-semibold">
                          R$ {svc.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="pt-2.5 border-t border-[#2A2A32] flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Total a pagar:</span>
                    <span className="text-[10px] text-[#8E8E98] block">
                      {priceCalculation.barberExcludedFromClub
                        ? `(Avulso c/ ${currentSelectedBarber?.nickname || 'Barbeiro'})`
                        : priceCalculation.hasSubscriberDiscount
                        ? '(Clube VIP 100% OFF)'
                        : isOrdemChegadaOnly
                        ? '(no balcão na chegada)'
                        : '(pagamento no balcão)'}
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-[#D4A373]">
                    R$ {priceCalculation.effectiveTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Form de WhatsApp e Identificação (Passo 2) */}
              <div className="mt-4 p-4 rounded-2xl bg-[#0F0F11] border border-[#2A2A32]/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon variant="official" size={18} />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Identificação por WhatsApp
                      </span>
                      <span className="text-[10px] text-[#8E8E98] block">
                        Aviso automático enviado ao finalizar
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    Aviso Automático
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-[#8E8E98] font-medium block mb-1">
                      Seu Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8E8E98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: Carlos Oliveira"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-[#16161A] text-xs text-white pl-10 pr-3.5 py-2.5 rounded-xl border border-[#2A2A32] focus:border-[#D4A373] outline-none transition-all placeholder:text-[#5E5E68]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8E8E98] font-medium block mb-1">
                      Seu WhatsApp (documento de identificação) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8E8E98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="Ex: (11) 98765-4321"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                        className="w-full bg-[#16161A] text-xs text-white pl-10 pr-3.5 py-2.5 rounded-xl border border-[#2A2A32] focus:border-[#D4A373] outline-none transition-all placeholder:text-[#5E5E68]"
                      />
                    </div>
                    <span className="text-[10px] text-[#8E8E98] block mt-1">
                      ✓ Todos os seus agendamentos e histórico ficam guardados neste número como seu documento.
                    </span>
                  </div>

                  {/* Returning Customer Recognition */}
                  {detectedCustomer && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <span className="font-bold text-blue-300 block text-[11px]">
                            Cliente Identificado: {detectedCustomer.name}
                          </span>
                          <span className="text-[10px] text-blue-200/80 block">
                            Histórico de {detectedCustomer.totalBookings || 1} {detectedCustomer.totalBookings === 1 ? 'visita' : 'visitas'} vinculado a este WhatsApp.
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase tracking-wider shrink-0">
                        Documento OK
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-[#8E8E98] font-medium block mb-1">
                      Alguma observação especial? (opcional)
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-[#8E8E98] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Ex: Prefiro tesoura no topo, barba alinhada..."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        className="w-full bg-[#16161A] text-xs text-white pl-10 pr-3.5 py-2.5 rounded-xl border border-[#2A2A32] focus:border-[#D4A373] outline-none transition-all placeholder:text-[#5E5E68]"
                      />
                    </div>
                  </div>
                </div>

                {/* Glowing VIP Subscriber Recognition Alert */}
                {detectedCustomer && activeCustomerPlan && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <Crown className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-300 block">
                        👑 Mensalista VIP Reconhecido!
                      </span>
                      <span className="text-[11px] text-purple-200/90 block mt-0.5">
                        Plano <strong>{activeCustomerPlan.nome}</strong> ativo.
                        {activeCustomerPlan.limite_cortes_mes === 0
                          ? ' Cortes ilimitados inclusos!'
                          : ` Cortes utilizados: ${detectedCustomer.cortes_utilizados_mes || 0}/${activeCustomerPlan.limite_cortes_mes}.`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Error Banner inside modal */}
              {errorMessage && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 pt-2 space-y-2">
                <button
                  disabled={isSubmitting}
                  onClick={handleBookNow}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 gold-glow transition-all active:scale-95 ${
                    isSubmitting
                      ? 'bg-[#2A2A32] text-[#8E8E98] cursor-not-allowed'
                      : isOrdemChegadaOnly
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:brightness-110 shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-r from-[#D4A373] to-[#B88656] text-[#0F0F11] hover:brightness-110'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Processando Agendamento...'
                      : isOrdemChegadaOnly
                      ? 'Confirmar Entrada na Fila'
                      : 'Confirmar Agendamento'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full py-2 text-xs text-[#8E8E98] hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  ← Voltar e alterar seleção
                </button>
              </div>

              {/* Microcopy reassuring automatic dispatch and phone document storage */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#0F0F11] border border-[#2A2A32]/70 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <WhatsAppIcon variant="official" size={14} />
                  <span>Não precisa confirmar no WhatsApp: o aviso vai automático!</span>
                </div>
                <p className="text-[10px] text-[#8E8E98]">
                  Cadastro automático no banco de dados. Seu número é seu documento para histórico e consultas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CONSULTAR MEUS CORTES & HISTÓRICO (SEM SENHA) */}
        {/* ========================================================================= */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A32] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#D4A373]" />
                  <h3 className="text-sm font-bold text-white">Meus Agendamentos & Histórico</h3>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#0F0F11] text-[#8E8E98] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4">
                <label className="text-[11px] text-[#8E8E98] font-medium block mb-1">
                  Digite seu WhatsApp cadastrado:
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={historySearchPhone}
                    onChange={(e) => setHistorySearchPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="flex-1 bg-[#0F0F11] text-xs text-white px-3 py-2.5 rounded-xl border border-[#2A2A32] outline-none focus:border-[#D4A373]"
                  />
                  <button
                    onClick={() => {
                      if (!historySearchPhone) {
                        showToast('Informe seu WhatsApp para consultar');
                      } else {
                        showToast('Histórico consultado');
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-[#D4A373] text-[#0F0F11] font-bold text-xs hover:brightness-110"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {customerHistoryList.length === 0 ? (
                  <div className="p-6 text-center text-[#8E8E98] text-xs">
                    {historySearchPhone
                      ? 'Nenhum agendamento encontrado para este número.'
                      : 'Digite seu WhatsApp acima para visualizar seus agendamentos.'}
                  </div>
                ) : (
                  customerHistoryList.map((item) => {
                    const isUpcoming = item.date >= getTodayDateString();
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border ${
                          isUpcoming
                            ? 'bg-[#0F0F11] border-[#D4A373]/50'
                            : 'bg-[#0F0F11]/50 border-[#2A2A32]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isUpcoming
                                ? 'bg-[#D4A373]/15 text-[#D4A373]'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isUpcoming ? 'PRÓXIMO AGENDAMENTO' : 'HISTÓRICO'}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {item.date} às {item.startTime}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white mt-2">
                          {item.services.map((s) => s.name).join(' + ')}
                        </h4>
                        <p className="text-[11px] text-[#8E8E98]">
                          Barbeiro: {item.barberName} • R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                        </p>

                        {isUpcoming && (
                          <div className="mt-2.5 pt-2 border-t border-[#2A2A32] flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmado no sistema
                            </span>
                            <a
                              href={`https://wa.me/55${cleanDigits(tenantConfig.ownerPhone || '11981234567')}?text=Ol%C3%A1%2C%20gostaria%20de%20reagendar%20meu%20corte%20do%20dia%20${item.date}%20%C3%A0s%20${item.startTime}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-400 font-bold hover:underline"
                            >
                              Reagendar via Zap
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: CLUBE DE ASSINATURAS VIP */}
        {/* ========================================================================= */}
        {isClubModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A32] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Clube de Assinaturas Naville</h3>
                </div>
                <button
                  onClick={() => setIsClubModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#0F0F11] text-[#8E8E98] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {clientPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-2xl bg-[#0F0F11] border border-purple-500/30 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{plan.nome}</h4>
                      <span className="text-sm font-extrabold text-purple-300">
                        R$ {plan.valor_mensal.toFixed(2).replace('.', ',')}/mês
                      </span>
                    </div>

                    <p className="text-xs text-[#8E8E98] mt-1">
                      {plan.limite_cortes_mes === 0
                        ? 'Cortes ilimitados durante todo o mês'
                        : `Até ${plan.limite_cortes_mes} cortes por ciclo mensal`}
                      {plan.permite_barba ? ' • Inclui Barba Terapia' : ''}
                    </p>

                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Desconto de 100% no balcão e no app</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Agendamento prioritário sem filas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Opção de pagamento manual no balcão ou cartão</span>
                      </li>
                    </ul>

                    {plan.link_mercado_pago ? (
                      <a
                        href={plan.link_mercado_pago}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <span>Assinar no Cartão (Mercado Pago)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <a
                        href={`https://wa.me/55${cleanDigits(tenantConfig.ownerPhone || '11981234567')}?text=Ol%C3%A1%2C%20gostaria%20de%20assinar%20o%20plano%20${encodeURIComponent(plan.nome)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full py-2.5 rounded-xl bg-[#D4A373] text-[#0F0F11] font-bold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md"
                      >
                        <WhatsAppIcon variant="official" size={14} />
                        <span>Ativar Assinatura na Recepção</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
