import { Barber, Booking, TimeBlock } from '../types';
import { addMinutesToTime, timeToMinutes } from './formatters';

/**
 * Checks if two intervals [startA, startA + durA] and [startB, startB + durB] overlap.
 * Intervals are [inclusive, exclusive) so an appointment ending at 10:00 does not conflict with one starting at 10:00.
 */
export function hasIntervalOverlap(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number
): boolean {
  const startAMins = timeToMinutes(startA);
  const endAMins = startAMins + durationA;
  const startBMins = timeToMinutes(startB);
  const endBMins = startBMins + durationB;

  return startAMins < endBMins && endAMins > startBMins;
}

export interface SlotAvailability {
  time: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
  reason?: string;
  availableBarberIds: string[];
}

export function calculateSlotAvailability(
  date: string,
  startTime: string,
  durationMinutes: number,
  selectedBarberId: string, // 'any' or specific barber id
  barbers: Barber[],
  bookings: Booking[],
  blocks: TimeBlock[],
  shopClosingTime: string = '20:00'
): SlotAvailability {
  const endTime = addMinutesToTime(startTime, durationMinutes);

  // Check if slot extends past shop closing time
  if (timeToMinutes(endTime) > timeToMinutes(shopClosingTime)) {
    return {
      time: startTime,
      endTime,
      available: false,
      reason: 'Ultrapassa o horário de encerramento da barbearia',
      availableBarberIds: [],
    };
  }

  // Active bookings for this date (excluding cancelled)
  const activeBookings = bookings.filter(
    (b) => b.date === date && b.status !== 'cancelled'
  );

  // Active blocks for this date
  const activeBlocks = blocks.filter((bl) => bl.date === date);

  // Determine available barbers for this slot
  const freeBarberIds: string[] = [];

  for (const barber of barbers) {
    // If user specifically picked another barber, skip this check
    if (selectedBarberId !== 'any' && barber.id !== selectedBarberId) {
      continue;
    }

    // 1. Check if barber has overlapping booking
    const hasBookingConflict = activeBookings.some((b) => {
      if (b.barberId !== barber.id) return false;
      return hasIntervalOverlap(startTime, durationMinutes, b.startTime, b.totalMinutes);
    });

    if (hasBookingConflict) {
      continue;
    }

    // 2. Check if barber has overlapping block
    const hasBlockConflict = activeBlocks.some((bl) => {
      if (bl.barberId !== 'all' && bl.barberId !== barber.id) return false;
      const blockDuration = timeToMinutes(bl.endTime) - timeToMinutes(bl.startTime);
      return hasIntervalOverlap(startTime, durationMinutes, bl.startTime, blockDuration);
    });

    if (hasBlockConflict) {
      continue;
    }

    // Barber is free!
    freeBarberIds.push(barber.id);
  }

  const isAvailable = freeBarberIds.length > 0;

  let reason = '';
  if (!isAvailable) {
    if (selectedBarberId !== 'any') {
      const barber = barbers.find((b) => b.id === selectedBarberId);
      reason = `${barber?.nickname || 'Profissional'} já possui agendamento ou bloqueio neste intervalo.`;
    } else {
      reason = 'Todos os profissionais estão ocupados ou com bloqueio de horário neste intervalo.';
    }
  }

  return {
    time: startTime,
    endTime,
    available: isAvailable,
    reason,
    availableBarberIds: freeBarberIds,
  };
}

export function generateDailyTimeSlots(
  startHour: number = 9,
  endHour: number = 20,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}
