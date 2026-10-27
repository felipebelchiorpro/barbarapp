import { TimeBlock } from '../types';
import { pb } from './pocketbase';

export const BLOCKS_COLLECTION = 'bloqueios_horarios';

/**
 * Busca todos os bloqueios de horários (folgas, pausas, almoço) de uma barbearia no PocketBase
 */
export async function fetchTimeBlocks(barbeariaId: string): Promise<TimeBlock[]> {
  try {
    const records = await pb.collection(BLOCKS_COLLECTION).getFullList({
      filter: `barbearia_id = "${barbeariaId}"`,
      sort: 'data,hora_inicio',
      requestKey: null,
    });

    return records.map((r: any) => ({
      id: r.id,
      barberId: r.barber_id,
      date: r.data,
      startTime: r.hora_inicio,
      endTime: r.hora_fim,
      reason: r.motivo,
      createdAt: r.created || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[BlockService] Falha ao carregar bloqueios do PocketBase:', err);
    return [];
  }
}

/**
 * Salva um novo bloqueio de horário no PocketBase
 */
export async function createTimeBlock(
  barbeariaId: string,
  block: Omit<TimeBlock, 'id' | 'createdAt'>
): Promise<TimeBlock> {
  try {
    const data = {
      barbearia_id: barbeariaId,
      barber_id: block.barberId,
      data: block.date,
      hora_inicio: block.startTime,
      hora_fim: block.endTime,
      motivo: block.reason,
    };
    const record = await pb.collection(BLOCKS_COLLECTION).create(data);
    return {
      id: record.id,
      barberId: record.barber_id,
      date: record.data,
      startTime: record.hora_inicio,
      endTime: record.hora_fim,
      reason: record.motivo,
      createdAt: record.created,
    };
  } catch (err) {
    console.warn('[BlockService] Erro ao salvar bloqueio no PocketBase, usando fallback local:', err);
    return {
      ...block,
      id: `blk-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Exclui um bloqueio de horário no PocketBase
 */
export async function deleteTimeBlock(blockId: string): Promise<boolean> {
  try {
    if (!blockId.startsWith('blk-')) {
      await pb.collection(BLOCKS_COLLECTION).delete(blockId);
    }
    return true;
  } catch (err) {
    console.warn('[BlockService] Erro ao excluir bloqueio:', err);
    return false;
  }
}
