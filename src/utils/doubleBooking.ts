import {
  Barber,
  Booking,
  TimeBlock,
  Service,
  ContiguousSlotOption,
  ContiguousSlotsResult,
  IntelligentAlternatives,
} from '../types';
import { addMinutesToTime, timeToMinutes, formatDuration } from './formatters';

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

export interface ContiguousSlotsOptions {
  slotIntervalMinutes?: number;
  bufferMinutes?: number;
  shopOpeningHour?: number;
  shopClosingHour?: number;
  shopClosingTime?: string;
  allowManualOverlap?: boolean;
  selectedServices?: Service[];
}

/**
 * Motor principal de validação de slots contínuos para múltiplos serviços.
 * Valida a janela contígua completa (duração total + buffer de respiro),
 * detecta slots isolados insuficientes para o combo e gera alternativas inteligentes.
 */
export function checkContiguousSlots(
  barberId: string,
  date: string,
  totalDurationMinutes: number,
  barbers: Barber[],
  bookings: Booking[],
  blocks: TimeBlock[],
  options: ContiguousSlotsOptions = {}
): ContiguousSlotsResult {
  const slotInterval = options.slotIntervalMinutes || 30;
  const buffer = options.bufferMinutes || 0;
  const shopClosing = options.shopClosingTime || '20:00';
  const startHour = options.shopOpeningHour || 9;
  const endHour = options.shopClosingHour || 20;

  const allTimes = generateDailyTimeSlots(startHour, endHour, slotInterval);
  const effectiveDuration = totalDurationMinutes + (options.allowManualOverlap ? 0 : buffer);

  const activeBookings = bookings.filter((b) => b.date === date && b.status !== 'cancelled');
  const activeBlocks = blocks.filter((bl) => bl.date === date);

  const slots: ContiguousSlotOption[] = allTimes.map((startTime) => {
    const endTime = addMinutesToTime(startTime, totalDurationMinutes);
    const startMins = timeToMinutes(startTime);
    const endMins = startMins + totalDurationMinutes;
    const closingMins = timeToMinutes(shopClosing);

    // 1. Checa se ultrapassa o horário de encerramento da barbearia
    if (endMins > closingMins) {
      return {
        time: startTime,
        endTime,
        available: false,
        reason: 'Ultrapassa o horário de encerramento da barbearia',
        availableBarberIds: [],
        slotsCount: Math.ceil(totalDurationMinutes / slotInterval),
        isIsolated: false,
        freeDurationMinutes: 0,
      };
    }

    // 2. Avalia cada profissional ativo elegível
    const freeBarbersForFullDuration: string[] = [];
    const freeBarbersForBaseSlot: string[] = [];
    let maxFreeMinutesForAnyBarber = 0;

    for (const barber of barbers) {
      if (barber.active === false) continue;
      if (barberId !== 'any' && barber.id !== barberId) continue;

      const barberBookings = activeBookings.filter((b) => b.barberId === barber.id);
      const barberBlocks = activeBlocks.filter(
        (bl) => bl.barberId === 'all' || bl.barberId === barber.id
      );

      // Conflito para a janela completa necessária (Duração + Respiro)
      const hasFullConflict =
        barberBookings.some((b) =>
          hasIntervalOverlap(
            startTime,
            effectiveDuration,
            b.startTime,
            b.totalMinutes + (options.allowManualOverlap ? 0 : buffer)
          )
        ) ||
        barberBlocks.some((bl) => {
          const blDur = timeToMinutes(bl.endTime) - timeToMinutes(bl.startTime);
          return hasIntervalOverlap(startTime, effectiveDuration, bl.startTime, blDur);
        });

      if (!hasFullConflict) {
        freeBarbersForFullDuration.push(barber.id);
      }

      // Conflito para 1 slot isolado básico (ex: apenas 30 minutos)
      const baseEffectiveDuration = slotInterval + (options.allowManualOverlap ? 0 : buffer);
      const hasBaseConflict =
        barberBookings.some((b) =>
          hasIntervalOverlap(
            startTime,
            baseEffectiveDuration,
            b.startTime,
            b.totalMinutes + (options.allowManualOverlap ? 0 : buffer)
          )
        ) ||
        barberBlocks.some((bl) => {
          const blDur = timeToMinutes(bl.endTime) - timeToMinutes(bl.startTime);
          return hasIntervalOverlap(startTime, baseEffectiveDuration, bl.startTime, blDur);
        });

      if (!hasBaseConflict) {
        freeBarbersForBaseSlot.push(barber.id);

        // Calcula a folga contígua real (em minutos) antes do próximo agendamento ou bloqueio
        let nextConflictMins = closingMins;
        for (const b of barberBookings) {
          const bStart = timeToMinutes(b.startTime);
          if (bStart >= startMins && bStart < nextConflictMins) {
            nextConflictMins = bStart;
          }
        }
        for (const bl of barberBlocks) {
          const blStart = timeToMinutes(bl.startTime);
          if (blStart >= startMins && blStart < nextConflictMins) {
            nextConflictMins = blStart;
          }
        }
        const freeMins = Math.max(0, nextConflictMins - startMins);
        if (freeMins > maxFreeMinutesForAnyBarber) {
          maxFreeMinutesForAnyBarber = freeMins;
        }
      }
    }

    const isAvailable = freeBarbersForFullDuration.length > 0;
    const isIsolated =
      !isAvailable && freeBarbersForBaseSlot.length > 0 && totalDurationMinutes > slotInterval;

    let reason = '';
    if (!isAvailable) {
      if (isIsolated) {
        reason = `Livre apenas para ${maxFreeMinutesForAnyBarber || slotInterval} min (insuficiente para combo de ${formatDuration(totalDurationMinutes)})`;
      } else if (barberId !== 'any') {
        const barber = barbers.find((b) => b.id === barberId);
        reason = `${barber?.nickname || 'Profissional'} já possui agendamento ou intervalo neste horário.`;
      } else {
        reason = 'Todos os profissionais estão ocupados ou com bloqueio de horário neste intervalo.';
      }
    }

    return {
      time: startTime,
      endTime,
      available: isAvailable,
      reason,
      availableBarberIds: freeBarbersForFullDuration,
      slotsCount: Math.ceil(totalDurationMinutes / slotInterval),
      isIsolated,
      freeDurationMinutes: isAvailable ? totalDurationMinutes : maxFreeMinutesForAnyBarber,
    };
  });

  const availableCount = slots.filter((s) => s.available).length;
  const isolatedCount = slots.filter((s) => s.isIsolated).length;
  const hasContiguousSlot = availableCount > 0;

  // Busca sugestões inteligentes de resolução quando não houver janela contígua suficiente
  const alternatives = findIntelligentAlternatives(
    barberId,
    date,
    totalDurationMinutes,
    barbers,
    bookings,
    blocks,
    options
  );

  return {
    date,
    durationMinutes: totalDurationMinutes,
    effectiveDurationMinutes: effectiveDuration,
    slots,
    availableCount,
    isolatedCount,
    hasContiguousSlot,
    alternatives,
  };
}

/**
 * Busca automática de alternativas quando não houver horário contíguo:
 * 1. Dividir ou agendar apenas o serviço principal (recalcula slots para 30 min)
 * 2. Verificar outro barbeiro que tenha a janela livre no mesmo dia
 * 3. Encontrar a próxima data disponível para ambos
 */
export function findIntelligentAlternatives(
  barberId: string,
  date: string,
  totalDurationMinutes: number,
  barbers: Barber[],
  bookings: Booking[],
  blocks: TimeBlock[],
  options: ContiguousSlotsOptions = {}
): IntelligentAlternatives {
  const selectedServices = options.selectedServices || [];

  // 1. Sugestão 1: Fazer apenas o serviço principal hoje
  let singleServiceOption: IntelligentAlternatives['singleServiceOption'] = undefined;
  if (selectedServices.length > 1) {
    const primaryService = selectedServices[0];
    if (primaryService.durationMinutes < totalDurationMinutes) {
      const singleSlots = generateDailyTimeSlots(
        options.shopOpeningHour || 9,
        options.shopClosingHour || 20,
        options.slotIntervalMinutes || 30
      );
      const freeSingleSlots = singleSlots.filter((time) => {
        const check = calculateSlotAvailability(
          date,
          time,
          primaryService.durationMinutes,
          barberId,
          barbers,
          bookings,
          blocks,
          options.shopClosingTime || '20:00',
          options.bufferMinutes || 0
        );
        return check.available;
      });

      if (freeSingleSlots.length > 0) {
        singleServiceOption = {
          service: primaryService,
          availableSlotsCount: freeSingleSlots.length,
          sampleTimes: freeSingleSlots.slice(0, 3),
        };
      }
    }
  }

  // 2. Sugestão 2: Outro profissional da barbearia que tenha a janela livre hoje
  let otherBarberOption: IntelligentAlternatives['otherBarberOption'] = undefined;
  if (barberId !== 'any' && barbers.length > 1) {
    const otherBarbers = barbers.filter((b) => b.id !== barberId && b.active !== false);
    for (const ob of otherBarbers) {
      const times = generateDailyTimeSlots(
        options.shopOpeningHour || 9,
        options.shopClosingHour || 20,
        options.slotIntervalMinutes || 30
      );
      const freeSlotsForOther = times.filter((time) => {
        const check = calculateSlotAvailability(
          date,
          time,
          totalDurationMinutes,
          ob.id,
          barbers,
          bookings,
          blocks,
          options.shopClosingTime || '20:00',
          options.bufferMinutes || 0
        );
        return check.available;
      });

      if (freeSlotsForOther.length > 0) {
        otherBarberOption = {
          barber: ob,
          firstAvailableTime: freeSlotsForOther[0],
          totalAvailableSlots: freeSlotsForOther.length,
        };
        break;
      }
    }
  }

  // 3. Sugestão 3: Próxima data com janela livre para ambos
  let nextAvailableDateOption: IntelligentAlternatives['nextAvailableDateOption'] = undefined;
  const targetBarber = barbers.find((b) => b.id === barberId);
  const barberName = barberId === 'any' ? 'Primeiro Disponível' : targetBarber?.name || 'Profissional';

  const [currY, currM, currD] = date.split('-').map(Number);
  const baseDate = new Date(currY, currM - 1, currD);

  for (let offset = 1; offset <= 14; offset++) {
    const checkDate = new Date(baseDate);
    checkDate.setDate(baseDate.getDate() + offset);

    // Domingo fechado (pode ser ajustado se a barbearia abrir domingo)
    if (checkDate.getDay() === 0) continue;

    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const times = generateDailyTimeSlots(
      options.shopOpeningHour || 9,
      options.shopClosingHour || 20,
      options.slotIntervalMinutes || 30
    );

    const availableTimes = times.filter((time) => {
      const check = calculateSlotAvailability(
        dateStr,
        time,
        totalDurationMinutes,
        barberId,
        barbers,
        bookings,
        blocks,
        options.shopClosingTime || '20:00',
        options.bufferMinutes || 0
      );
      return check.available;
    });

    if (availableTimes.length > 0) {
      const weekdayName = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayNum = checkDate.getDate();
      const monthNum = String(checkDate.getMonth() + 1).padStart(2, '0');
      const formattedDate = `${weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)} (${dayNum}/${monthNum})`;

      nextAvailableDateOption = {
        dateStr,
        formattedDate,
        firstAvailableTime: availableTimes[0],
        barberName,
      };
      break;
    }
  }

  const hasAlternatives = Boolean(
    singleServiceOption || otherBarberOption || nextAvailableDateOption
  );

  return {
    hasAlternatives,
    singleServiceOption,
    otherBarberOption,
    nextAvailableDateOption,
  };
}

/**
 * Função utilitária de checagem individual (com suporte a buffer de respiro)
 */
export function calculateSlotAvailability(
  date: string,
  startTime: string,
  durationMinutes: number,
  selectedBarberId: string, // 'any' or specific barber id
  barbers: Barber[],
  bookings: Booking[],
  blocks: TimeBlock[],
  shopClosingTime: string = '20:00',
  bufferMinutes: number = 0
): SlotAvailability {
  const endTime = addMinutesToTime(startTime, durationMinutes);
  const neededDuration = durationMinutes + bufferMinutes;

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
    if (barber.active === false) continue;
    // If user specifically picked another barber, skip this check
    if (selectedBarberId !== 'any' && barber.id !== selectedBarberId) {
      continue;
    }

    // 1. Check if barber has overlapping booking (including buffer)
    const hasBookingConflict = activeBookings.some((b) => {
      if (b.barberId !== barber.id) return false;
      return hasIntervalOverlap(startTime, neededDuration, b.startTime, b.totalMinutes + bufferMinutes);
    });

    if (hasBookingConflict) {
      continue;
    }

    // 2. Check if barber has overlapping block
    const hasBlockConflict = activeBlocks.some((bl) => {
      if (bl.barberId !== 'all' && bl.barberId !== barber.id) return false;
      const blockDuration = timeToMinutes(bl.endTime) - timeToMinutes(bl.startTime);
      return hasIntervalOverlap(startTime, neededDuration, bl.startTime, blockDuration);
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
      reason = `${barber?.nickname || 'Profissional'} já possui agendamento ou intervalo neste horário.`;
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
