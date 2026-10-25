import React from 'react';
import { CheckCircle2, CalendarPlus, X, Copy, Check } from 'lucide-react';
import { Booking } from '../../types';
import { formatCurrency, formatDatePtBR, formatDuration } from '../../utils/formatters';
import { createBookingConfirmationMessage, generateWhatsAppDirectLink } from '../../services/webhookService';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface BookingSuccessModalProps {
  booking: Booking;
  onClose: () => void;
  onOpenWebhooks?: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  booking,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  const confirmationMessage = createBookingConfirmationMessage(booking);
  const waLink = generateWhatsAppDirectLink(booking.customerPhone, confirmationMessage);

  const handleCopy = () => {
    navigator.clipboard.writeText(confirmationMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddToCalendar = () => {
    // Generate Google Calendar Link
    const [year, month, day] = booking.date.split('-');
    const [startH, startM] = booking.startTime.split(':');
    const [endH, endM] = booking.endTime.split(':');

    const startISO = `${year}${month}${day}T${startH}${startM}00`;
    const endISO = `${year}${month}${day}T${endH}${endM}00`;

    const title = encodeURIComponent(`Naville Barber - ${booking.services.map((s) => s.name).join(', ')}`);
    const details = encodeURIComponent(
      `Atendimento com ${booking.barberName}.\nServiços: ${booking.services.map((s) => s.name).join(', ')}\nValor: ${formatCurrency(booking.totalPrice)}`
    );
    const location = encodeURIComponent('Rua Augusta, 1420 - Consolação, São Paulo - SP');

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`;
    window.open(gcalUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-[#18181B] border border-[#D4AF37]/30 shadow-2xl p-5 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[#D4AF37]/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
            Agendamento Confirmado!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto">
            Seu horário na <strong>Naville Barber</strong> foi reservado no sistema e o webhook de confirmação foi disparado.
          </p>
        </div>

        {/* Booking Card Details */}
        <div className="mt-5 p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-3 text-left">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
            <span className="text-[11px] uppercase font-bold text-zinc-400">Código da Reserva</span>
            <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase">
              #{booking.id.slice(-6)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Cliente</span>
              <span className="text-white font-semibold">{booking.customerName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Barbeiro</span>
              <span className="text-white font-semibold">{booking.barberName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Data</span>
              <span className="text-white font-semibold">{formatDatePtBR(booking.date)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Horário</span>
              <span className="text-amber-300 font-bold tabular-nums">{booking.startTime} às {booking.endTime}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {booking.services.length} {booking.services.length === 1 ? 'serviço' : 'serviços'} ({formatDuration(booking.totalMinutes)})
            </span>
            <span className="text-sm font-display font-extrabold text-[#D4AF37] tabular-nums">
              {formatCurrency(booking.totalPrice)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          {/* WhatsApp Direct */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-[0.98]"
          >
            <WhatsAppIcon variant="official" size={20} />
            <span>Abrir Comprovante no WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            {/* Copy Details */}
            <button
              onClick={handleCopy}
              className="h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition border border-white/5"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Dados</span>
                </>
              )}
            </button>

            {/* Google Calendar */}
            <button
              onClick={handleAddToCalendar}
              className="h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition border border-white/5"
            >
              <CalendarPlus className="w-4 h-4 text-amber-400" />
              <span>Google Agenda</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
