/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 008: WhatsApp Message Templates & Audit History
 * Anti-Ban Humanized Dispatch Engine & Custom Templates
 *
 * Coleções criadas:
 * 1. templates_mensagens:
 *    - barbearia_id (relation -> barbearias, required)
 *    - tipo_evento (select: confirmacao_agendamento, lembrete_2h, reativacao_cliente, required)
 *    - conteudo (text UTF-8/emojis, required)
 *    - delay_segundos (number, default: 35, min: 10, max: 180)
 *    - simular_digitando (bool, default: true)
 *    - ativo (bool, default: true)
 *
 * 2. historico_mensagens_whatsapp:
 *    - barbearia_id (relation -> barbearias, required)
 *    - agendamento_id (relation -> agendamentos, optional)
 *    - cliente_nome (text)
 *    - cliente_telefone (text)
 *    - tipo_evento (select: confirmacao_agendamento, lembrete_2h, reativacao_cliente, teste)
 *    - mensagem (text)
 *    - status (select: enviado, falha, simulando_digitando)
 *    - delay_aplicado (number)
 *    - simulou_digitando (bool)
 *    - evolution_response (json)
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId('barbearias');
    const agendamentos = app.findCollectionByNameOrId('agendamentos');

    // 1. Coleção 'templates_mensagens'
    const templatesMensagens = new Collection({
      name: 'templates_mensagens',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        {
          name: 'tipo_evento',
          type: 'select',
          values: ['confirmacao_agendamento', 'lembrete_2h', 'reativacao_cliente'],
          required: true,
        },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'delay_segundos', type: 'number', required: true },
        { name: 'simular_digitando', type: 'bool', required: true },
        { name: 'ativo', type: 'bool', required: true },
      ],
      listRule: '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)',
      viewRule: '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)',
      createRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id)',
      updateRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
      deleteRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
    });
    app.save(templatesMensagens);

    // 2. Coleção 'historico_mensagens_whatsapp'
    const historicoMensagens = new Collection({
      name: 'historico_mensagens_whatsapp',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'agendamento_id', type: 'relation', collectionId: agendamentos ? agendamentos.id : '', required: false },
        { name: 'cliente_nome', type: 'text' },
        { name: 'cliente_telefone', type: 'text' },
        {
          name: 'tipo_evento',
          type: 'select',
          values: ['confirmacao_agendamento', 'lembrete_2h', 'reativacao_cliente', 'teste'],
          required: true,
        },
        { name: 'mensagem', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['enviado', 'falha', 'simulando_digitando'],
          required: true,
        },
        { name: 'delay_aplicado', type: 'number' },
        { name: 'simulou_digitando', type: 'bool' },
        { name: 'evolution_response', type: 'json' },
      ],
      listRule: '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id',
      viewRule: '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id',
      createRule: '@request.auth.role = "superadmin" || @request.auth.id = ""',
      updateRule: '@request.auth.role = "superadmin"',
      deleteRule: '@request.auth.role = "superadmin"',
    });
    app.save(historicoMensagens);

    // 3. População dos templates padrão para barbearias existentes
    try {
      const allBarbearias = app.findRecordsByFilter('barbearias', 'id != ""', '+id', 100, 0);
      const defaultTemplates = [
        {
          tipo_evento: 'confirmacao_agendamento',
          conteudo:
            'Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.',
          delay_segundos: 35,
          simular_digitando: true,
          ativo: true,
        },
        {
          tipo_evento: 'lembrete_2h',
          conteudo:
            'Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.',
          delay_segundos: 25,
          simular_digitando: true,
          ativo: true,
        },
        {
          tipo_evento: 'reativacao_cliente',
          conteudo:
            'Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!',
          delay_segundos: 40,
          simular_digitando: true,
          ativo: true,
        },
      ];

      for (const b of allBarbearias) {
        for (const t of defaultTemplates) {
          const rec = new Record(templatesMensagens);
          rec.set('barbearia_id', b.id);
          rec.set('tipo_evento', t.tipo_evento);
          rec.set('conteudo', t.conteudo);
          rec.set('delay_segundos', t.delay_segundos);
          rec.set('simular_digitando', t.simular_digitando);
          rec.set('ativo', t.ativo);
          app.save(rec);
        }
      }
    } catch (err) {
      console.warn('Erro ao semear templates iniciais:', err);
    }
  },
  // Rollback reversível
  (app) => {
    const collections = ['historico_mensagens_whatsapp', 'templates_mensagens'];
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name);
        if (col) app.delete(col);
      } catch {}
    }
  }
);
