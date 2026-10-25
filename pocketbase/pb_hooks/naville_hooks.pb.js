/// <reference path="../pb_data/types.d.ts" />
/**
 * PocketBase v0.40+ Lifecycle Hooks & WhatsApp Anti-Ban Automation Engine
 * Naville SaaS - Motor de Mensagens Personalizadas + Anti-Ban Humanizado (Evolution API)
 */

// 1. Hook para gerar slug antes de salvar barbearia
onRecordCreate((e) => {
  const nome = e.record.get("nome_fantasia") || e.record.get("name") || "barbearia";
  let slug = e.record.get("slug");
  if (!slug || slug.trim() === "") {
    slug = nome
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
    e.record.set("slug", slug);
  }
}, "barbearias");

// 2. Hook após criação de nova barbearia: cria instância na Evolution API e semeia templates padrão
onRecordAfterCreateSuccess((e) => {
  const recordId = e.record.id;
  const instanceName = "naville_barbearia_" + recordId;
  const randomToken = $security.randomString(32);
  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  // Cria instância na Evolution API
  try {
    $http.send({
      url: evoApiUrl + "/instance/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evoApiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        integration: "WHATSAPP-BAILEYS",
        token: randomToken,
        webhook: {
          url: "http://pocketbase:8090/api/webhooks/evolution",
          byEvents: false,
          events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT"],
        },
      }),
      timeout: 10,
    });

    e.record.set("evolution_instance_name", instanceName);
    e.record.set("whatsapp_status", "disconnected");
    $app.save(e.record);
  } catch (err) {
    console.error("Erro ao criar instancia Evolution:", err);
  }

  // Semeia templates padrão para esta nova barbearia
  try {
    const colTemplates = $app.findCollectionByNameOrId("templates_mensagens");
    if (colTemplates) {
      const defaults = [
        {
          tipo: "confirmacao_agendamento",
          conteudo: "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.",
          delay: 35,
          simular: true
        },
        {
          tipo: "lembrete_2h",
          conteudo: "Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.",
          delay: 25,
          simular: true
        },
        {
          tipo: "reativacao_cliente",
          conteudo: "Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!",
          delay: 40,
          simular: true
        }
      ];

      for (let i = 0; i < defaults.length; i++) {
        const item = defaults[i];
        const rec = new Record(colTemplates);
        rec.set("barbearia_id", recordId);
        rec.set("tipo_evento", item.tipo);
        rec.set("conteudo", item.conteudo);
        rec.set("delay_segundos", item.delay);
        rec.set("simular_digitando", item.simular);
        rec.set("ativo", true);
        $app.save(rec);
      }
    }
  } catch (errTpl) {
    console.error("Erro ao semear templates para nova barbearia:", errTpl);
  }
}, "barbearias");

// 3. Worker de Disparo Seguro (Anti-Ban Engine) no Agendamento
onRecordAfterCreateSuccess((e) => {
  const agendamento = e.record;
  const barbeariaId = agendamento.get("barbearia_id");
  const barbeiroId = agendamento.get("barbeiro_id");
  const clienteId = agendamento.get("cliente_id");
  const clienteNome = agendamento.get("cliente_nome") || "Cliente";
  const rawTelefone = agendamento.get("cliente_telefone") || "";
  const dataRaw = agendamento.get("data") || "";
  const horarioRaw = agendamento.get("horario") || "";
  const servicosIds = agendamento.get("servicos_ids") || [];

  // 3.1 Normalizar telefone para formato padrão internacional
  let cleanPhone = rawTelefone.toString().replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 8) {
    console.log("[AntiBan Worker] Telefone inválido ou ausente para agendamento " + agendamento.id);
    return;
  }
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = "55" + cleanPhone;
  }

  // 3.2 Buscar barbearia e instância do WhatsApp
  let barbearia = null;
  let instanceName = "naville_barbearia_" + barbeariaId;
  try {
    barbearia = $app.findRecordById("barbearias", barbeariaId);
    if (barbearia && barbearia.get("evolution_instance_name")) {
      instanceName = barbearia.get("evolution_instance_name");
    }
  } catch (err) {
    console.error("[AntiBan Worker] Erro ao buscar barbearia " + barbeariaId + ":", err);
  }

  // 3.3 Buscar template de confirmação de agendamento
  let templateRecord = null;
  try {
    templateRecord = $app.findFirstRecordByFilter(
      "templates_mensagens",
      "barbearia_id = {:bid} && tipo_evento = 'confirmacao_agendamento'",
      { bid: barbeariaId }
    );
  } catch (_) {}

  // Se existir e estiver explicitamente desativado, aborta disparo
  if (templateRecord && templateRecord.get("ativo") === false) {
    console.log("[AntiBan Worker] Template de confirmação desativado para barbearia " + barbeariaId);
    return;
  }

  let templateContent = templateRecord
    ? templateRecord.get("conteudo")
    : "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.";

  let delaySegundos = templateRecord
    ? Number(templateRecord.get("delay_segundos") || 35)
    : 35;
  let simularDigitando = templateRecord
    ? Boolean(templateRecord.get("simular_digitando"))
    : true;

  // Garante limites seguros de delay (min 10, max 180)
  if (delaySegundos < 10) delaySegundos = 10;
  if (delaySegundos > 180) delaySegundos = 180;

  // 3.4 Resolver variáveis dinâmicas
  // Barbeiro
  let barbeiroNome = "Profissional";
  if (barbeiroId) {
    try {
      const barbeiro = $app.findRecordById("barbeiros", barbeiroId);
      if (barbeiro && barbeiro.get("nome")) {
        barbeiroNome = barbeiro.get("nome");
      }
    } catch (_) {}
  }

  // Serviços
  let servicosNomes = "Atendimento";
  try {
    const list = Array.isArray(servicosIds) ? servicosIds : [servicosIds];
    const nomes = [];
    for (let i = 0; i < list.length; i++) {
      try {
        const s = $app.findRecordById("servicos", list[i]);
        if (s && s.get("nome")) nomes.push(s.get("nome"));
      } catch (_) {}
    }
    if (nomes.length > 0) servicosNomes = nomes.join(" + ");
  } catch (_) {}

  // Data formatada (ex: 2026-10-25 -> 25/10/2026)
  let dataFormatada = dataRaw;
  if (dataRaw && dataRaw.includes("-")) {
    const parts = dataRaw.split("-");
    if (parts.length === 3) {
      dataFormatada = parts[2] + "/" + parts[1] + "/" + parts[0];
    }
  }

  // Benefício Clube de Assinatura
  let beneficioClube = "💡 Dica: Conheça nosso Clube de Assinatura e corte à vontade economizando até 40%!";
  if (clienteId) {
    try {
      const sub = $app.findFirstRecordByFilter(
        "assinaturas_clientes",
        "barbearia_id = {:bid} && cliente_id = {:cid} && status = 'ativo'",
        { bid: barbeariaId, cid: clienteId }
      );
      if (sub) {
        beneficioClube = "⭐ Membro do Clube VIP: Corte incluso no seu plano!";
      }
    } catch (_) {}
  }

  // Substituição das tags {variavel}
  const finalMessage = templateContent
    .replace(/\{nome_cliente\}/g, clienteNome)
    .replace(/\{barbeiro\}/g, barbeiroNome)
    .replace(/\{horario\}/g, horarioRaw)
    .replace(/\{data\}/g, dataFormatada)
    .replace(/\{servico\}/g, servicosNomes)
    .replace(/\{beneficio_clube\}/g, beneficioClube);

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  console.log(
    "[AntiBan Worker] Aguardando delay de " +
      delaySegundos +
      "s antes do disparo para " +
      cleanPhone +
      "..."
  );

  // 3.5 Anti-Ban: 1. Aguardar tempo definido em delay_segundos
  sleep(delaySegundos * 1000);

  // 3.6 Anti-Ban: 2. Se simular_digitando == true, enviar presence "composing" e aguardar 4s
  if (simularDigitando) {
    try {
      console.log("[AntiBan Worker] Enviando presence 'composing' para Evolution API...");
      $http.send({
        url: evoApiUrl + "/chat/sendPresence/" + instanceName,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evoApiKey,
        },
        body: JSON.stringify({
          number: cleanPhone,
          presence: "composing",
          delay: 4000,
        }),
        timeout: 10,
      });

      // Aguarda os 4 segundos de digitação humanizada
      sleep(4000);
    } catch (errPresence) {
      console.warn("[AntiBan Worker] Falha leve ao enviar presence 'composing':", errPresence);
    }
  }

  // 3.7 Anti-Ban: 3. Enviar a mensagem definitiva via POST /message/sendText/{instance}
  let sendStatus = "falha";
  let evoResponse = null;

  try {
    console.log("[AntiBan Worker] Disparando mensagem final para " + cleanPhone + " via " + instanceName);
    const res = $http.send({
      url: evoApiUrl + "/message/sendText/" + instanceName,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evoApiKey,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: finalMessage,
      }),
      timeout: 20,
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      sendStatus = "enviado";
      evoResponse = res.json || { status: res.statusCode };
    } else {
      evoResponse = { error: "HTTP " + res.statusCode, raw: res.raw };
      console.error("[AntiBan Worker] Falha no envio da mensagem:", res.raw);
    }
  } catch (errSend) {
    evoResponse = { error: String(errSend) };
    console.error("[AntiBan Worker] Erro de rede ao disparar mensagem:", errSend);
  }

  // 3.8 Anti-Ban: 4. Gravar log de envio na tabela historico_mensagens_whatsapp para auditoria
  try {
    const colHistorico = $app.findCollectionByNameOrId("historico_mensagens_whatsapp");
    if (colHistorico) {
      const logRec = new Record(colHistorico);
      logRec.set("barbearia_id", barbeariaId);
      logRec.set("agendamento_id", agendamento.id);
      logRec.set("cliente_nome", clienteNome);
      logRec.set("cliente_telefone", cleanPhone);
      logRec.set("tipo_evento", "confirmacao_agendamento");
      logRec.set("mensagem", finalMessage);
      logRec.set("status", sendStatus);
      logRec.set("delay_aplicado", delaySegundos);
      logRec.set("simulou_digitando", simularDigitando);
      logRec.set("evolution_response", evoResponse);
      $app.save(logRec);
      console.log("[AntiBan Worker] Log de auditoria gravado com sucesso. Status: " + sendStatus);
    }
  } catch (errLog) {
    console.error("[AntiBan Worker] Erro ao gravar historico_mensagens_whatsapp:", errLog);
  }
}, "agendamentos");

// 4. Endpoint de Gestão: GET /api/barbearia/whatsapp/qrcode
routerAdd("GET", "/api/barbearia/whatsapp/qrcode", (e) => {
  const query = e.requestInfo().query || {};
  const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";
  let instanceName = "naville_barbearia_" + barbeariaId;

  try {
    const record = $app.findRecordById("barbearias", barbeariaId);
    if (record && record.get("evolution_instance_name")) {
      instanceName = record.get("evolution_instance_name");
    }
  } catch (_) {}

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  try {
    const res = $http.send({
      url: evoApiUrl + "/instance/connect/" + instanceName,
      method: "GET",
      headers: {
        "apikey": evoApiKey,
      },
      timeout: 30,
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, res.json);
    }
    return e.json(res.statusCode, { error: "Falha na Evolution API", details: res.raw });
  } catch (err) {
    return e.json(500, { error: "Falha de conexão com a Evolution API", details: String(err) });
  }
});

// 5. Endpoint de Gestão: GET /api/barbearia/whatsapp/status
routerAdd("GET", "/api/barbearia/whatsapp/status", (e) => {
  const query = e.requestInfo().query || {};
  const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";
  let instanceName = "naville_barbearia_" + barbeariaId;
  let record = null;

  try {
    record = $app.findRecordById("barbearias", barbeariaId);
    if (record && record.get("evolution_instance_name")) {
      instanceName = record.get("evolution_instance_name");
    }
  } catch (_) {}

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  try {
    const res = $http.send({
      url: evoApiUrl + "/instance/connectionState/" + instanceName,
      method: "GET",
      headers: {
        "apikey": evoApiKey,
      },
      timeout: 5,
    });

    let state = "close";
    let phone = null;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const data = res.json;
      state = data?.instance?.state || data?.state || "close";
      phone = data?.instance?.owner || data?.owner || null;
    }

    if (record && record.get("whatsapp_status") !== state) {
      record.set("whatsapp_status", state);
      if (phone) record.set("whatsapp_phone", phone);
      $app.save(record);
    }

    return e.json(200, { status: state, phone: phone, instanceName: instanceName });
  } catch (err) {
    const fallbackStatus = record ? record.get("whatsapp_status") || "close" : "close";
    return e.json(200, { status: fallbackStatus, instanceName: instanceName });
  }
});

// 6. Endpoint de Gestão: POST /api/barbearia/whatsapp/logout
routerAdd("POST", "/api/barbearia/whatsapp/logout", (e) => {
  const reqInfo = e.requestInfo();
  const body = reqInfo.body || {};
  const query = reqInfo.query || {};

  const barbeariaId = body.barbearia_id || body.tenant_id || query.barbearia_id || "kd2eakh5cijm61x";
  let instanceName = "naville_barbearia_" + barbeariaId;
  let record = null;

  try {
    record = $app.findRecordById("barbearias", barbeariaId);
    if (record && record.get("evolution_instance_name")) {
      instanceName = record.get("evolution_instance_name");
    }
  } catch (_) {}

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  try {
    $http.send({
      url: evoApiUrl + "/instance/logout/" + instanceName,
      method: "DELETE",
      headers: {
        "apikey": evoApiKey,
      },
      timeout: 8,
    });

    if (record) {
      record.set("whatsapp_status", "close");
      record.set("whatsapp_phone", "");
      $app.save(record);
    }

    return e.json(200, { success: true, message: "WhatsApp desconectado com sucesso" });
  } catch (err) {
    return e.json(500, { error: "Erro ao desconectar instância", details: String(err) });
  }
});

// 7. Endpoint de Gestão: GET /api/barbearia/whatsapp/templates
routerAdd("GET", "/api/barbearia/whatsapp/templates", (e) => {
  try {
    const query = e.requestInfo().query || {};
    const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";

    let records = $app.findRecordsByFilter(
      "templates_mensagens",
      "barbearia_id = {:bid}",
      "",
      50,
      0,
      { bid: barbeariaId }
    );

    // Se a barbearia não possuir templates salvos ainda, semeia os padrões
    if (!records || records.length === 0) {
      const colTemplates = $app.findCollectionByNameOrId("templates_mensagens");
      if (colTemplates) {
        const defaults = [
          {
            tipo: "confirmacao_agendamento",
            conteudo: "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.",
            delay: 35,
            simular: true
          },
          {
            tipo: "lembrete_2h",
            conteudo: "Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.",
            delay: 25,
            simular: true
          },
          {
            tipo: "reativacao_cliente",
            conteudo: "Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!",
            delay: 40,
            simular: true
          }
        ];

        for (let i = 0; i < defaults.length; i++) {
          const item = defaults[i];
          const rec = new Record(colTemplates);
          rec.set("barbearia_id", barbeariaId);
          rec.set("tipo_evento", item.tipo);
          rec.set("conteudo", item.conteudo);
          rec.set("delay_segundos", item.delay);
          rec.set("simular_digitando", item.simular);
          rec.set("ativo", true);
          $app.save(rec);
        }

        records = $app.findRecordsByFilter(
          "templates_mensagens",
          "barbearia_id = {:bid}",
          "",
          50,
          0,
          { bid: barbeariaId }
        );
      }
    }

    const list = [];
    if (records) {
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        list.push({
          id: r.id,
          barbearia_id: r.get("barbearia_id"),
          tipo_evento: r.get("tipo_evento"),
          conteudo: r.get("conteudo"),
          delay_segundos: r.get("delay_segundos"),
          simular_digitando: r.get("simular_digitando"),
          ativo: r.get("ativo"),
        });
      }
    }

    return e.json(200, { templates: list });
  } catch (err) {
    console.error("Erro no GET templates:", err);
    return e.json(500, { error: "Erro ao buscar templates", details: String(err) });
  }
});

// 8. Endpoint de Gestão: POST /api/barbearia/whatsapp/templates (Salvar/Upsert)
routerAdd("POST", "/api/barbearia/whatsapp/templates", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const barbeariaId = body.barbearia_id || body.tenant_id;
    const tipoEvento = body.tipo_evento || "confirmacao_agendamento";
    const conteudo = body.conteudo;
    const delaySegundos = Number(body.delay_segundos !== undefined ? body.delay_segundos : 35);
    const simularDigitando = body.simular_digitando !== false;
    const ativo = body.ativo !== false;

    if (!barbeariaId || !conteudo) {
      return e.json(400, { error: "barbearia_id e conteudo são obrigatórios." });
    }

    const boundedDelay = Math.min(180, Math.max(10, delaySegundos));
    const colTemplates = $app.findCollectionByNameOrId("templates_mensagens");
    let record = null;
    try {
      record = $app.findFirstRecordByFilter(
        "templates_mensagens",
        "barbearia_id = {:bid} && tipo_evento = {:tipo}",
        { bid: barbeariaId, tipo: tipoEvento }
      );
    } catch (_) {}

    if (!record) {
      record = new Record(colTemplates);
      record.set("barbearia_id", barbeariaId);
      record.set("tipo_evento", tipoEvento);
    }

    record.set("conteudo", conteudo);
    record.set("delay_segundos", boundedDelay);
    record.set("simular_digitando", simularDigitando);
    record.set("ativo", ativo);
    $app.save(record);

    return e.json(200, {
      success: true,
      template: {
        id: record.id,
        barbearia_id: record.get("barbearia_id"),
        tipo_evento: record.get("tipo_evento"),
        conteudo: record.get("conteudo"),
        delay_segundos: record.get("delay_segundos"),
        simular_digitando: record.get("simular_digitando"),
        ativo: record.get("ativo"),
      },
    });
  } catch (err) {
    console.error("Erro no POST templates:", err);
    return e.json(500, { error: "Erro ao salvar template", details: String(err) });
  }
});

// 9. Endpoint de Teste: POST /api/barbearia/whatsapp/test-send
routerAdd("POST", "/api/barbearia/whatsapp/test-send", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const barbeariaId = body.barbearia_id || body.tenant_id || "kd2eakh5cijm61x";
    const rawTelefone = body.telefone || "";
    const tipoEvento = body.tipo_evento || "confirmacao_agendamento";
    const customConteudo = body.conteudo;
    const simularDigitando = body.simular_digitando !== false;

    let cleanPhone = rawTelefone.toString().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      return e.json(400, { error: "Informe um número de WhatsApp válido para o envio de teste." });
    }
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = "55" + cleanPhone;
    }

    let instanceName = "naville_barbearia_" + barbeariaId;
    try {
      const record = $app.findRecordById("barbearias", barbeariaId);
      if (record && record.get("evolution_instance_name")) {
        instanceName = record.get("evolution_instance_name");
      }
    } catch (_) {}

    let templateContent = customConteudo;
    if (!templateContent) {
      try {
        const rec = $app.findFirstRecordByFilter(
          "templates_mensagens",
          "barbearia_id = {:bid} && tipo_evento = {:tipo}",
          { bid: barbeariaId, tipo: tipoEvento }
        );
        if (rec) templateContent = rec.get("conteudo");
      } catch (_) {}
    }
    if (!templateContent) {
      templateContent = "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.";
    }

    // Substitui com dados simulados
    const testMessage = templateContent
      .replace(/\{nome_cliente\}/g, "Gabriel Silva (Teste)")
      .replace(/\{barbeiro\}/g, "Carlos Silva")
      .replace(/\{horario\}/g, "15:30")
      .replace(/\{data\}/g, "Amanhã")
      .replace(/\{servico\}/g, "Corte Degradê + Barba")
      .replace(/\{beneficio_clube\}/g, "⭐ Membro do Clube VIP: Corte incluso no seu plano!");

    const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
    const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

    if (simularDigitando) {
      try {
        $http.send({
          url: evoApiUrl + "/chat/sendPresence/" + instanceName,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evoApiKey,
          },
          body: JSON.stringify({
            number: cleanPhone,
            presence: "composing",
            delay: 4000,
          }),
          timeout: 10,
        });
        sleep(4000);
      } catch (_) {}
    }

    const res = $http.send({
      url: evoApiUrl + "/message/sendText/" + instanceName,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evoApiKey,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: testMessage,
      }),
      timeout: 20,
    });

    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

    // Registra log de teste
    try {
      const colHistorico = $app.findCollectionByNameOrId("historico_mensagens_whatsapp");
      if (colHistorico) {
        const logRec = new Record(colHistorico);
        logRec.set("barbearia_id", barbeariaId);
        logRec.set("cliente_nome", "Teste Manual");
        logRec.set("cliente_telefone", cleanPhone);
        logRec.set("tipo_evento", "teste");
        logRec.set("mensagem", testMessage);
        logRec.set("status", isSuccess ? "enviado" : "falha");
        logRec.set("delay_aplicado", 0);
        logRec.set("simulou_digitando", simularDigitando);
        logRec.set("evolution_response", res.json || { raw: res.raw });
        $app.save(logRec);
      }
    } catch (_) {}

    if (isSuccess) {
      return e.json(200, { success: true, message: "Mensagem de teste enviada com sucesso!", data: res.json });
    }
    return e.json(res.statusCode, { error: "Erro da Evolution API", details: res.raw });
  } catch (err) {
    console.error("Erro no test-send:", err);
    return e.json(500, { error: "Falha de conexão com a Evolution API", details: String(err) });
  }
});

// 10. Endpoint de Auditoria: GET /api/barbearia/whatsapp/history
routerAdd("GET", "/api/barbearia/whatsapp/history", (e) => {
  try {
    const query = e.requestInfo().query || {};
    const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";

    const records = $app.findRecordsByFilter(
      "historico_mensagens_whatsapp",
      "barbearia_id = {:bid}",
      "-id",
      50,
      0,
      { bid: barbeariaId }
    );

    const list = [];
    if (records) {
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        list.push({
          id: r.id,
          barbearia_id: r.get("barbearia_id"),
          agendamento_id: r.get("agendamento_id"),
          cliente_nome: r.get("cliente_nome"),
          cliente_telefone: r.get("cliente_telefone"),
          tipo_evento: r.get("tipo_evento"),
          mensagem: r.get("mensagem"),
          status: r.get("status"),
          delay_aplicado: r.get("delay_aplicado"),
          simulou_digitando: r.get("simulou_digitando"),
          evolution_response: r.get("evolution_response"),
        });
      }
    }

    return e.json(200, { history: list });
  } catch (err) {
    console.error("Erro no history:", err);
    return e.json(500, { error: "Erro ao buscar histórico", details: String(err) });
  }
});

// 11. Endpoint de Webhook para recepção de eventos da Evolution API
routerAdd("POST", "/api/webhooks/evolution", (e) => {
  const body = e.requestInfo().body || {};
  const event = body?.event;
  const instance = body?.instance;

  if (event === "CONNECTION_UPDATE" && instance) {
    try {
      const records = $app.findRecordsByFilter(
        "barbearias",
        "evolution_instance_name = {:inst}",
        "",
        1,
        0,
        { inst: instance }
      );
      if (records && records.length > 0) {
        const barbearia = records[0];
        const state = body?.data?.state || (body?.data?.status === "open" ? "open" : "close");
        barbearia.set("whatsapp_status", state);
        $app.save(barbearia);
      }
    } catch (err) {
      console.error("Erro no webhook CONNECTION_UPDATE:", err);
    }
  }

  return e.json(200, { received: true });
});


// 14. Proteção de Campos Críticos: Travar 'is_vitalicio' e 'plano_saas'
// Apenas tokens com role 'superadmin' podem modificar esses campos
onRecordUpdate((e) => {
  try {
    const authRecord = e.httpContext ? e.httpContext.get("authRecord") : null;
    const isSuperAdmin = authRecord && authRecord.get("role") === "superadmin";

    if (!isSuperAdmin) {
      const original = e.record.original();
      if (original) {
        if (e.record.get("is_vitalicio") !== original.get("is_vitalicio")) {
          e.record.set("is_vitalicio", original.get("is_vitalicio"));
        }
        if (e.record.get("plano_saas") !== original.get("plano_saas")) {
          e.record.set("plano_saas", original.get("plano_saas"));
        }
      }
    }
  } catch (err) {
    console.error("Erro no hook de proteção de campos de barbearia:", err);
  }
  e.next();
}, "barbearias");
