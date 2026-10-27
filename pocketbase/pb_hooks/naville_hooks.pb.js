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
          tipo: "pos_corte",
          conteudo: "Opa {nome_cliente}, e aí, tudo bem? 💈✂️\n\nPassando pra agradecer a preferência hoje no seu {servico} com {barbeiro}! Espero que tenha gostado do resultado.\n\nQuando precisar dar aquele talento no visual de novo, estamos aí de volta! Tamo junto! 🤝",
          delay: 35,
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
  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  let barbearia = null;
  const bid = barbeariaId || "kd2eakh5cijm61x";
  try { barbearia = $app.findRecordById("barbearias", bid); } catch (_) {
    try {
      const records = $app.findRecordsByFilter("barbearias", "slug = '" + bid + "' || id = '" + bid + "'", "-created", 1);
      if (records && records.length > 0) barbearia = records[0];
    } catch (_) {}
  }
  if (!barbearia) {
    try { barbearia = $app.findRecordById("barbearias", "kd2eakh5cijm61x"); } catch (_) {}
  }

  let instanceName = (barbearia && barbearia.get("evolution_instance_name"))
    ? barbearia.get("evolution_instance_name")
    : ("naville_barbearia_" + bid);

  let isTargetOpen = false;
  try {
    const cRes = $http.send({
      url: evoApiUrl + "/instance/connectionState/" + instanceName,
      method: "GET",
      headers: { "apikey": evoApiKey },
      timeout: 3,
    });
    if (cRes.statusCode >= 200 && cRes.statusCode < 300) {
      const d = cRes.json;
      if ((d && (d.instance ? d.instance.state : d.state)) === "open") isTargetOpen = true;
    }
  } catch (_) {}

  if (!isTargetOpen) {
    try {
      const fRes = $http.send({
        url: evoApiUrl + "/instance/fetchInstances",
        method: "GET",
        headers: { "apikey": evoApiKey },
        timeout: 4,
      });
      if (fRes.statusCode >= 200 && fRes.statusCode < 300 && Array.isArray(fRes.json)) {
        const allInstances = fRes.json;
        let openInst = null;
        for (let i = 0; i < allInstances.length; i++) {
          if (allInstances[i].connectionStatus === "open") {
            openInst = allInstances[i];
            break;
          }
        }
        if (openInst) {
          instanceName = openInst.name;
          if (barbearia) {
            try {
              barbearia.set("evolution_instance_name", openInst.name);
              barbearia.set("whatsapp_status", "open");
              if (openInst.ownerJid) {
                barbearia.set("whatsapp_phone", openInst.ownerJid.replace(/@.*$/, ""));
              }
              $app.save(barbearia);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
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
        "Content-Type": "application/json; charset=utf-8",
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

// 4. Endpoint de Gestão: GET /api/barbearia/whatsapp/qrcode (Com Auto-Provisionamento & Auto-Recuperação 404)
routerAdd("GET", "/api/barbearia/whatsapp/qrcode", (e) => {
  const query = e.requestInfo().query || {};
  const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";
  let instanceName = "naville_barbearia_" + barbeariaId;
  let record = null;

  try {
    record = $app.findRecordById("barbearias", barbeariaId);
    if (record && record.get("evolution_instance_name")) {
      instanceName = record.get("evolution_instance_name");
    }
  } catch (_) {
    try {
      const records = $app.findRecordsByFilter("barbearias", "slug = '" + barbeariaId + "' || id = '" + barbeariaId + "'", "-created", 1);
      if (records && records.length > 0) {
        record = records[0];
        if (record.get("evolution_instance_name")) {
          instanceName = record.get("evolution_instance_name");
        }
      }
    } catch (_) {}
  }

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  // Função interna de provisionamento direto
  const autoCreateInstance = function() {
    try {
      const payload = JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      });
      return $http.send({
        url: evoApiUrl + "/instance/create",
        method: "POST",
        headers: {
          "apikey": evoApiKey,
          "Content-Type": "application/json"
        },
        data: payload,
        timeout: 30,
      });
    } catch (errCreate) {
      console.error("[Evolution AutoProvision] Erro ao criar instancia " + instanceName + ":", errCreate);
      return null;
    }
  };

  try {
    // 1. Tenta conectar para obter o QR Code da instância
    let res = $http.send({
      url: evoApiUrl + "/instance/connect/" + instanceName,
      method: "GET",
      headers: {
        "apikey": evoApiKey,
      },
      timeout: 30,
    });

    // 2. Se a instância não existe (404), AUTO-CRIA a instância na hora e gera o QR Code!
    if (res.statusCode === 404 || (res.raw && res.raw.includes("does not exist"))) {
      console.log("[Evolution] Instancia " + instanceName + " nao encontrada na Evolution API. Auto-criando e gerando QR Code...");
      const createRes = autoCreateInstance();

      if (createRes && createRes.statusCode >= 200 && createRes.statusCode < 300) {
        const createData = createRes.json;
        const base64 = createData?.qrcode?.base64 || createData?.base64;
        if (base64) {
          if (record) {
            record.set("evolution_instance_name", instanceName);
            record.set("whatsapp_status", "connecting");
            try { $app.save(record); } catch (_) {}
          }
          return e.json(200, {
            base64: base64,
            pairingCode: createData?.qrcode?.pairingCode || createData?.pairingCode || null,
            code: createData?.qrcode?.code || createData?.code || null,
            count: createData?.qrcode?.count || 1,
            instance: instanceName,
            status: "connecting"
          });
        }
      }

      // Se foi criada e precisa solicitar connect para capturar o QR Code recém-gerado:
      res = $http.send({
        url: evoApiUrl + "/instance/connect/" + instanceName,
        method: "GET",
        headers: {
          "apikey": evoApiKey,
        },
        timeout: 30,
      });
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (record) {
        record.set("evolution_instance_name", instanceName);
        record.set("whatsapp_status", "connecting");
        try { $app.save(record); } catch (_) {}
      }
      return e.json(200, res.json);
    }
    return e.json(res.statusCode, { error: "Falha na Evolution API", details: res.raw });
  } catch (err) {
    return e.json(500, { error: "Falha de conexão com a Evolution API", details: String(err) });
  }
});

// Hook: Auto-criar instância Evolution API ao cadastrar uma nova barbearia
onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const barbeariaId = record.id;
  const instanceName = "naville_barbearia_" + barbeariaId;

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  try {
    record.set("evolution_instance_name", instanceName);
    record.set("whatsapp_status", "connecting");
    $app.save(record);

    console.log("[AutoProvision] Nova barbearia cadastrada (" + barbeariaId + "). Auto-criando instancia: " + instanceName);
    const payload = JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    });
    $http.send({
      url: evoApiUrl + "/instance/create",
      method: "POST",
      headers: {
        "apikey": evoApiKey,
        "Content-Type": "application/json"
      },
      body: payload,
      timeout: 30,
    });
  } catch (err) {
    console.error("[AutoProvision] Erro ao auto-provisionar instancia para nova barbearia:", err);
  }
}, "barbearias");

// 5. Endpoint de Gestão: GET /api/barbearia/whatsapp/status
routerAdd("GET", "/api/barbearia/whatsapp/status", (e) => {
  const query = e.requestInfo().query || {};
  const barbeariaId = query.barbearia_id || query.tenant_id || "kd2eakh5cijm61x";

  const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
  const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

  let record = null;
  const bid = barbeariaId || "kd2eakh5cijm61x";
  try { record = $app.findRecordById("barbearias", bid); } catch (_) {
    try {
      const records = $app.findRecordsByFilter("barbearias", "slug = '" + bid + "' || id = '" + bid + "'", "-created", 1);
      if (records && records.length > 0) record = records[0];
    } catch (_) {}
  }
  if (!record) {
    try { record = $app.findRecordById("barbearias", "kd2eakh5cijm61x"); } catch (_) {}
  }

  let instanceName = (record && record.get("evolution_instance_name"))
    ? record.get("evolution_instance_name")
    : ("naville_barbearia_" + bid);

  let state = "close";
  let phone = record ? record.get("whatsapp_phone") : null;

  try {
    const res = $http.send({
      url: evoApiUrl + "/instance/connectionState/" + instanceName,
      method: "GET",
      headers: { "apikey": evoApiKey },
      timeout: 4,
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const data = res.json;
      state = data?.instance?.state || data?.state || "close";
      phone = data?.instance?.owner || data?.owner || phone;
    }
  } catch (_) {}

  // Se não estiver open, busca instância ativa
  if (state !== "open") {
    try {
      const fetchRes = $http.send({
        url: evoApiUrl + "/instance/fetchInstances",
        method: "GET",
        headers: { "apikey": evoApiKey },
        timeout: 4,
      });
      if (fetchRes.statusCode >= 200 && fetchRes.statusCode < 300 && Array.isArray(fetchRes.json)) {
        const allInstances = fetchRes.json;
        let openInst = null;
        for (let i = 0; i < allInstances.length; i++) {
          if (allInstances[i].connectionStatus === "open") {
            openInst = allInstances[i];
            break;
          }
        }
        if (openInst) {
          instanceName = openInst.name;
          state = "open";
          if (openInst.ownerJid) phone = openInst.ownerJid.replace(/@.*$/, "");
          if (record) {
            try {
              record.set("evolution_instance_name", openInst.name);
              record.set("whatsapp_status", "open");
              if (phone) record.set("whatsapp_phone", phone);
              $app.save(record);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  if (record && record.get("whatsapp_status") !== state) {
    record.set("whatsapp_status", state);
    if (phone) record.set("whatsapp_phone", phone);
    try { $app.save(record); } catch (_) {}
  }

  return e.json(200, { status: state, phone: phone, instanceName: instanceName });
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
    const rawBid = query.barbearia_id || query.tenant_id || "naville-principal";
    const cleanSlug = String(rawBid).replace(/^tenant-/, "").toLowerCase();

    let barbearia = null;
    try { barbearia = $app.findRecordById("barbearias", rawBid); } catch (_) {}
    if (!barbearia) {
      try {
        const found = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: rawBid });
        if (found && found.length > 0) barbearia = found[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const anyList = $app.findRecordsByFilter("barbearias", "", "", 1, 0);
        if (anyList && anyList.length > 0 && (rawBid === "kd2eakh5cijm61x" || rawBid === "naville-principal")) {
          barbearia = anyList[0];
        }
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const colBarb = $app.findCollectionByNameOrId("barbearias");
        const newB = new Record(colBarb);
        newB.set("name", cleanSlug || "Barbearia Oficial");
        newB.set("nome_fantasia", cleanSlug || "Barbearia Oficial");
        newB.set("slug", cleanSlug || "barbearia-oficial");
        newB.set("status", "active");
        $app.save(newB);
        barbearia = newB;
      } catch (_) {}
    }
    const barbeariaId = barbearia ? barbearia.id : rawBid;

    let records = [];
    try {
      records = $app.findRecordsByFilter(
        "templates_mensagens",
        "barbearia_id = {:bid}",
        "",
        50,
        0,
        { bid: barbeariaId }
      );
    } catch (_) {}

    // Garante que todos os 4 templates padrão existam para a barbearia
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
          tipo: "pos_corte",
          conteudo: "Opa {nome_cliente}, e aí, tudo bem? 💈✂️\n\nPassando pra agradecer a preferência hoje no seu {servico} com {barbeiro}! Espero que tenha gostado do resultado.\n\nQuando precisar dar aquele talento no visual de novo, estamos aí de volta! Tamo junto! 🤝",
          delay: 35,
          simular: true
        },
        {
          tipo: "reativacao_cliente",
          conteudo: "Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!",
          delay: 40,
          simular: true
        }
      ];

      const existingTypes = {};
      if (records) {
        for (let i = 0; i < records.length; i++) {
          existingTypes[records[i].get("tipo_evento")] = true;
        }
      }

      let createdAny = false;
      for (let i = 0; i < defaults.length; i++) {
        const item = defaults[i];
        if (!existingTypes[item.tipo]) {
          try {
            const rec = new Record(colTemplates);
            rec.set("barbearia_id", barbeariaId);
            rec.set("tipo_evento", item.tipo);
            rec.set("conteudo", item.conteudo);
            rec.set("delay_segundos", item.delay);
            rec.set("simular_digitando", item.simular);
            rec.set("ativo", true);
            $app.save(rec);
            createdAny = true;
          } catch (_) {}
        }
      }

      if (createdAny) {
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
    const rawBid = body.barbearia_id || body.tenant_id || "naville-principal";
    const cleanSlug = String(rawBid).replace(/^tenant-/, "").toLowerCase();
    const tipoEvento = body.tipo_evento || "confirmacao_agendamento";
    const conteudo = body.conteudo;
    const delaySegundos = Number(body.delay_segundos !== undefined ? body.delay_segundos : 35);
    const simularDigitando = body.simular_digitando !== false;
    const ativo = body.ativo !== false;

    if (!rawBid || !conteudo) {
      return e.json(400, { error: "barbearia_id e conteudo são obrigatórios." });
    }

    let barbearia = null;
    try { barbearia = $app.findRecordById("barbearias", rawBid); } catch (_) {}
    if (!barbearia) {
      try {
        const found = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: rawBid });
        if (found && found.length > 0) barbearia = found[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const anyList = $app.findRecordsByFilter("barbearias", "", "", 1, 0);
        if (anyList && anyList.length > 0 && (rawBid === "kd2eakh5cijm61x" || rawBid === "naville-principal")) {
          barbearia = anyList[0];
        }
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const colBarb = $app.findCollectionByNameOrId("barbearias");
        const newB = new Record(colBarb);
        newB.set("name", cleanSlug || "Barbearia Oficial");
        newB.set("nome_fantasia", cleanSlug || "Barbearia Oficial");
        newB.set("slug", cleanSlug || "barbearia-oficial");
        newB.set("status", "active");
        $app.save(newB);
        barbearia = newB;
      } catch (_) {}
    }
    const barbeariaId = barbearia ? barbearia.id : rawBid;

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

    const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
    const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

    let record = null;
    const bid = barbeariaId || "naville-principal";
    const cleanSlug = String(bid).replace(/^tenant-/, "").toLowerCase();
    try { record = $app.findRecordById("barbearias", bid); } catch (_) {}
    if (!record) {
      try {
        const records = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: bid });
        if (records && records.length > 0) record = records[0];
      } catch (_) {}
    }
    if (!record) {
      try {
        const anyList = $app.findRecordsByFilter("barbearias", "", "", 1, 0);
        if (anyList && anyList.length > 0) record = anyList[0];
      } catch (_) {}
    }
    if (!record) {
      try {
        const colBarb = $app.findCollectionByNameOrId("barbearias");
        const newB = new Record(colBarb);
        newB.set("name", cleanSlug || "Barbearia Oficial");
        newB.set("nome_fantasia", cleanSlug || "Barbearia Oficial");
        newB.set("slug", cleanSlug || "barbearia-oficial");
        newB.set("status", "active");
        $app.save(newB);
        record = newB;
      } catch (_) {}
    }
    const realBarbeariaId = record ? record.id : bid;

    let instanceName = (record && record.get("evolution_instance_name"))
      ? record.get("evolution_instance_name")
      : ("naville_barbearia_" + bid);

    let isTargetOpen = false;
    try {
      const cRes = $http.send({
        url: evoApiUrl + "/instance/connectionState/" + instanceName,
        method: "GET",
        headers: { "apikey": evoApiKey },
        timeout: 3,
      });
      if (cRes.statusCode >= 200 && cRes.statusCode < 300) {
        const d = cRes.json;
        if ((d && (d.instance ? d.instance.state : d.state)) === "open") isTargetOpen = true;
      }
    } catch (_) {}

    if (!isTargetOpen) {
      try {
        const fRes = $http.send({
          url: evoApiUrl + "/instance/fetchInstances",
          method: "GET",
          headers: { "apikey": evoApiKey },
          timeout: 4,
        });
        if (fRes.statusCode >= 200 && fRes.statusCode < 300 && Array.isArray(fRes.json)) {
          const allInstances = fRes.json;
          let openInst = null;
          for (let i = 0; i < allInstances.length; i++) {
            if (allInstances[i].connectionStatus === "open") {
              openInst = allInstances[i];
              break;
            }
          }
          if (openInst) {
            instanceName = openInst.name;
            if (record) {
              try {
                record.set("evolution_instance_name", openInst.name);
                record.set("whatsapp_status", "open");
                if (openInst.ownerJid) {
                  record.set("whatsapp_phone", openInst.ownerJid.replace(/@.*$/, ""));
                }
                $app.save(record);
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

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
        "Content-Type": "application/json; charset=utf-8",
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
      if (colHistorico && record) {
        const logRec = new Record(colHistorico);
        logRec.set("barbearia_id", realBarbeariaId);
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
      return e.json(200, { success: true, message: "Mensagem de teste enviada com sucesso ao seu WhatsApp!", data: res.json });
    }
    const errObj = res.json || {};
    const errMsg = (errObj.response && errObj.response.message)
      ? (Array.isArray(errObj.response.message) ? errObj.response.message.join(", ") : String(errObj.response.message))
      : (errObj.message || errObj.error || "Erro ao enviar mensagem pelo WhatsApp");
    return e.json(res.statusCode, { error: errMsg, details: res.raw });
  } catch (err) {
    console.error("Erro no test-send:", err);
    return e.json(500, { error: "Falha de conexão com a Evolution API", details: String(err) });
  }
});

// 10. Endpoint de Auditoria: GET /api/barbearia/whatsapp/history
routerAdd("GET", "/api/barbearia/whatsapp/history", (e) => {
  try {
    const query = e.requestInfo().query || {};
    const rawBid = query.barbearia_id || query.tenant_id || "";
    const cleanSlug = String(rawBid).replace(/^tenant-/, "").toLowerCase();

    let barbearia = null;
    if (rawBid) {
      try { barbearia = $app.findRecordById("barbearias", rawBid); } catch (_) {}
      if (!barbearia) {
        try {
          const found = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: rawBid });
          if (found && found.length > 0) barbearia = found[0];
        } catch (_) {}
      }
    }

    let records = [];
    if (barbearia) {
      records = $app.findRecordsByFilter(
        "historico_mensagens_whatsapp",
        "barbearia_id = {:bid}",
        "-id",
        50,
        0,
        { bid: barbearia.id }
      );
    } else {
      records = $app.findRecordsByFilter(
        "historico_mensagens_whatsapp",
        "",
        "-id",
        50,
        0
      );
    }

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

// 10.5. Endpoint de Pós-Corte (Agendamento de mensagem para 30 minutos após finalizar o atendimento)
routerAdd("POST", "/api/barbearia/whatsapp/post-cut", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const rawBarbeariaId = body.barbearia_id || body.tenant_id || "kd2eakh5cijm61x";
    const agendamentoId = body.agendamento_id || "";
    const clienteNome = body.cliente_nome || "Cliente";
    const rawTelefone = body.cliente_telefone || "";
    const barbeiroNome = body.barbeiro_nome || "Profissional";
    const servicoNome = body.servico_nome || "Corte";
    const horarioRaw = body.horario || "";
    const dataRaw = body.data || "Hoje";
    const delayMinutos = body.delay_minutos !== undefined ? Number(body.delay_minutos) : 30;

    let cleanPhone = rawTelefone.toString().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      return e.json(400, { error: "Telefone do cliente inválido ou ausente para pós-corte." });
    }
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = "55" + cleanPhone;
    }

    // Resolver barbearia real no PocketBase
    const cleanSlug = String(rawBarbeariaId).replace(/^tenant-/, "").toLowerCase();
    let barbearia = null;
    try { barbearia = $app.findRecordById("barbearias", rawBarbeariaId); } catch (_) {}
    if (!barbearia) {
      try {
        const list = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: rawBarbeariaId });
        if (list && list.length > 0) barbearia = list[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const anyList = $app.findRecordsByFilter("barbearias", "", "", 1, 0);
        if (anyList && anyList.length > 0) barbearia = anyList[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const colBarb = $app.findCollectionByNameOrId("barbearias");
        const newB = new Record(colBarb);
        newB.set("name", cleanSlug || "Barbearia Oficial");
        newB.set("nome_fantasia", cleanSlug || "Barbearia Oficial");
        newB.set("slug", cleanSlug || "barbearia-oficial");
        newB.set("status", "active");
        $app.save(newB);
        barbearia = newB;
      } catch (_) {}
    }
    const barbeariaId = barbearia ? barbearia.id : rawBarbeariaId;

    // Buscar template pos_corte
    let templateRecord = null;
    try {
      templateRecord = $app.findFirstRecordByFilter(
        "templates_mensagens",
        "barbearia_id = {:bid} && tipo_evento = 'pos_corte'",
        { bid: barbeariaId }
      );
    } catch (_) {}

    if (templateRecord && templateRecord.get("ativo") === false) {
      return e.json(200, {
        success: false,
        skipped: true,
        message: "Automação de Pós-Corte está pausada para esta barbearia."
      });
    }

    const templateContent = templateRecord
      ? templateRecord.get("conteudo")
      : "Opa {nome_cliente}, e aí, tudo bem? 💈✂️\n\nPassando pra agradecer a preferência hoje no seu {servico} com {barbeiro}! Espero que tenha gostado do resultado.\n\nQuando precisar dar aquele talento no visual de novo, estamos aí de volta! Tamo junto! 🤝";

    const simularDigitando = templateRecord ? Boolean(templateRecord.get("simular_digitando")) : true;
    const delaySegundosAntiBan = templateRecord ? Number(templateRecord.get("delay_segundos") || 35) : 35;

    const finalMessage = templateContent
      .replace(/\{nome_cliente\}/g, clienteNome)
      .replace(/\{barbeiro\}/g, barbeiroNome)
      .replace(/\{horario\}/g, horarioRaw || "hoje")
      .replace(/\{data\}/g, dataRaw || "hoje")
      .replace(/\{servico\}/g, servicoNome)
      .replace(/\{beneficio_clube\}/g, "⭐ Conheça também nosso Clube VIP na próxima visita!");

    // Evitar duplicidade se o barbeiro clicar duas vezes em finalizar para o mesmo telefone
    try {
      const pending = $app.findRecordsByFilter(
        "historico_mensagens_whatsapp",
        "barbearia_id = {:bid} && cliente_telefone = {:tel} && tipo_evento = 'pos_corte' && status = 'agendado'",
        "-id",
        1,
        0,
        { bid: barbeariaId, tel: cleanPhone }
      );
      if (pending && pending.length > 0) {
        return e.json(200, {
          success: true,
          alreadyScheduled: true,
          message: "Mensagem pós-corte já está agendada para este cliente."
        });
      }
    } catch (_) {}

    const safeMinutes = Math.max(0, Math.min(180, isNaN(delayMinutos) ? 30 : delayMinutos));
    const scheduledForMs = Date.now() + safeMinutes * 60 * 1000;

    const colHistorico = $app.findCollectionByNameOrId("historico_mensagens_whatsapp");
    const logRec = new Record(colHistorico);
    logRec.set("barbearia_id", barbeariaId);

    // Verifica se agendamentoId existe na coleção agendamentos antes de vincular a relation
    if (agendamentoId) {
      try {
        const agRec = $app.findRecordById("agendamentos", agendamentoId);
        if (agRec) logRec.set("agendamento_id", agRec.id);
      } catch (_) {}
    }

    logRec.set("cliente_nome", clienteNome);
    logRec.set("cliente_telefone", cleanPhone);
    logRec.set("tipo_evento", "pos_corte");
    logRec.set("mensagem", finalMessage);
    logRec.set("status", "agendado");
    logRec.set("delay_aplicado", safeMinutes * 60);
    logRec.set("simulou_digitando", simularDigitando);
    logRec.set("evolution_response", {
      scheduledFor: scheduledForMs,
      scheduledForIso: new Date(scheduledForMs).toISOString(),
      delayMinutes: safeMinutes,
      antiBanDelaySeconds: delaySegundosAntiBan,
      agendamentoRef: agendamentoId,
      barbeiroNome: barbeiroNome,
      servicoNome: servicoNome
    });
    $app.save(logRec);

    console.log("[PostCut Scheduler] Mensagem pós-corte agendada para " + clienteNome + " (" + cleanPhone + ") em " + safeMinutes + " min.");

    return e.json(200, {
      success: true,
      id: logRec.id,
      scheduledFor: new Date(scheduledForMs).toISOString(),
      delayMinutes: safeMinutes,
      message: "Mensagem pós-corte agendada para envio em " + safeMinutes + " minutos!"
    });
  } catch (err) {
    console.error("[PostCut Scheduler] Erro ao agendar pós-corte:", err);
    return e.json(500, { error: "Erro ao agendar mensagem pós-corte", details: String(err) });
  }
});

// 10.6. Cron Worker: Processa a fila de mensagens Pós-Corte e Lembrete 2h a cada 1 minuto
cronAdd("post_cut_whatsapp_worker", "* * * * *", () => {
  try {
    const pendingList = $app.findRecordsByFilter(
      "historico_mensagens_whatsapp",
      "(tipo_evento = 'pos_corte' || tipo_evento = 'lembrete_2h') && status = 'agendado'",
      "id",
      25,
      0
    );

    if (!pendingList || pendingList.length === 0) return;

    const nowMs = Date.now();
    const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
    const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

    for (let i = 0; i < pendingList.length; i++) {
      const item = pendingList[i];
      let meta = item.get("evolution_response");
      if (typeof meta === "string") {
        try { meta = JSON.parse(meta); } catch (_) { meta = {}; }
      }
      const scheduledFor = (meta && meta.scheduledFor) ? Number(meta.scheduledFor) : 0;

      // Se ainda não deu os 30 minutos, aguarda o próximo ciclo do cron
      if (scheduledFor > nowMs) {
        continue;
      }

      const barbeariaId = item.get("barbearia_id") || "kd2eakh5cijm61x";
      const cleanPhone = item.get("cliente_telefone");
      const finalMessage = item.get("mensagem");
      const simularDigitando = Boolean(item.get("simulou_digitando"));

      // Verifica se o dono desativou o template nesse meio tempo
      try {
        const tpl = $app.findFirstRecordByFilter(
          "templates_mensagens",
          "barbearia_id = {:bid} && tipo_evento = 'pos_corte'",
          { bid: barbeariaId }
        );
        if (tpl && tpl.get("ativo") === false) {
          item.set("status", "falha");
          item.set("evolution_response", { canceled: "Template desativado antes do envio" });
          $app.save(item);
          continue;
        }
      } catch (_) {}

      // Descobrir instância ativa da barbearia
      let barbearia = null;
      try { barbearia = $app.findRecordById("barbearias", barbeariaId); } catch (_) {}
      let instanceName = (barbearia && barbearia.get("evolution_instance_name"))
        ? barbearia.get("evolution_instance_name")
        : ("naville_barbearia_" + barbeariaId);

      let isTargetOpen = false;
      try {
        const cRes = $http.send({
          url: evoApiUrl + "/instance/connectionState/" + instanceName,
          method: "GET",
          headers: { "apikey": evoApiKey },
          timeout: 3,
        });
        if (cRes.statusCode >= 200 && cRes.statusCode < 300) {
          const d = cRes.json;
          if ((d && (d.instance ? d.instance.state : d.state)) === "open") isTargetOpen = true;
        }
      } catch (_) {}

      if (!isTargetOpen) {
        try {
          const fRes = $http.send({
            url: evoApiUrl + "/instance/fetchInstances",
            method: "GET",
            headers: { "apikey": evoApiKey },
            timeout: 4,
          });
          if (fRes.statusCode >= 200 && fRes.statusCode < 300 && Array.isArray(fRes.json)) {
            const allInstances = fRes.json;
            for (let k = 0; k < allInstances.length; k++) {
              if (allInstances[k].connectionStatus === "open") {
                instanceName = allInstances[k].name;
                break;
              }
            }
          }
        } catch (_) {}
      }

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
            timeout: 8,
          });
          sleep(4000);
        } catch (_) {}
      }

      try {
        const res = $http.send({
          url: evoApiUrl + "/message/sendText/" + instanceName,
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "apikey": evoApiKey,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: finalMessage,
          }),
          timeout: 20,
        });

        if (res.statusCode >= 200 && res.statusCode < 300) {
          item.set("status", "enviado");
          item.set("evolution_response", res.json || { status: res.statusCode, sentAt: new Date().toISOString() });
          console.log("[PostCut Worker] Mensagem pós-corte enviada com sucesso para " + cleanPhone);
        } else {
          item.set("status", "falha");
          item.set("evolution_response", { error: "HTTP " + res.statusCode, raw: res.raw });
          console.error("[PostCut Worker] Falha ao enviar pós-corte para " + cleanPhone + ": " + res.raw);
        }
      } catch (errSend) {
        item.set("status", "falha");
        item.set("evolution_response", { error: String(errSend) });
      }

      $app.save(item);
    }
  } catch (errCron) {
    console.error("[PostCut Worker] Erro no cron de pós-corte:", errCron);
  }
});

// 10.7. Endpoint Oficial de Confirmação de Agendamento + Agendamento Automático do Lembrete de 2h
routerAdd("POST", "/api/barbearia/whatsapp/booking-created", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const rawBarbeariaId = body.barbearia_id || body.tenant_id || "naville-principal";
    const barbeariaNome = body.barbearia_nome || "Barbearia";
    const agendamentoId = body.agendamento_id || "";
    const clienteNome = body.cliente_nome || "Cliente";
    const rawTelefone = body.cliente_telefone || "";
    const barbeiroNome = body.barbeiro_nome || "Profissional";
    const servicoNome = body.servico_nome || "Corte";
    const dataRaw = body.data || "";
    const horarioRaw = body.horario || "";
    const beneficioClube = body.beneficio_clube || "💡 Dica: Conheça nosso Clube de Assinatura e economize nos seus próximos cortes!";

    let cleanPhone = rawTelefone.toString().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      return e.json(400, { error: "Telefone inválido para confirmação de agendamento." });
    }
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = "55" + cleanPhone;
    }

    const cleanSlug = String(rawBarbeariaId).replace(/^tenant-/, "").toLowerCase();
    let barbearia = null;
    try { barbearia = $app.findRecordById("barbearias", rawBarbeariaId); } catch (_) {}
    if (!barbearia) {
      try {
        const list = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:r}", "", 1, 0, { s: cleanSlug, r: rawBarbeariaId });
        if (list && list.length > 0) barbearia = list[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const anyList = $app.findRecordsByFilter("barbearias", "", "", 1, 0);
        if (anyList && anyList.length > 0) barbearia = anyList[0];
      } catch (_) {}
    }
    if (!barbearia) {
      try {
        const colBarb = $app.findCollectionByNameOrId("barbearias");
        const newB = new Record(colBarb);
        newB.set("name", barbeariaNome || cleanSlug);
        newB.set("nome_fantasia", barbeariaNome || cleanSlug);
        newB.set("slug", cleanSlug || "barbearia-oficial");
        newB.set("status", "active");
        $app.save(newB);
        barbearia = newB;
      } catch (_) {}
    }
    const barbeariaId = barbearia ? barbearia.id : rawBarbeariaId;

    // Formatar data YYYY-MM-DD -> DD/MM/YYYY
    let dataFormatada = dataRaw;
    if (dataRaw && dataRaw.includes("-")) {
      const parts = dataRaw.split("-");
      if (parts.length === 3) {
        dataFormatada = parts[2] + "/" + parts[1] + "/" + parts[0];
      }
    }

    // 1. Buscar template de confirmação
    let tplConfirm = null;
    try {
      tplConfirm = $app.findFirstRecordByFilter(
        "templates_mensagens",
        "barbearia_id = {:bid} && tipo_evento = 'confirmacao_agendamento'",
        { bid: barbeariaId }
      );
    } catch (_) {}

    if (tplConfirm && tplConfirm.get("ativo") === false) {
      return e.json(200, { success: false, skipped: true, message: "Template de confirmação desativado." });
    }

    const confirmContent = tplConfirm
      ? tplConfirm.get("conteudo")
      : "Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.";

    const simularDigitando = tplConfirm ? Boolean(tplConfirm.get("simular_digitando")) : true;
    const delayConfigured = tplConfirm ? Number(tplConfirm.get("delay_segundos") || 35) : 35;

    const finalConfirmMessage = confirmContent
      .replace(/\{nome_cliente\}/g, clienteNome)
      .replace(/\{barbeiro\}/g, barbeiroNome)
      .replace(/\{horario\}/g, horarioRaw)
      .replace(/\{data\}/g, dataFormatada)
      .replace(/\{servico\}/g, servicoNome)
      .replace(/\{beneficio_clube\}/g, beneficioClube);

    // Descobrir instância ativa na Evolution API
    const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
    const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";

    let instanceName = (barbearia && barbearia.get("evolution_instance_name"))
      ? barbearia.get("evolution_instance_name")
      : ("naville_barbearia_" + barbeariaId);

    let isTargetOpen = false;
    try {
      const cRes = $http.send({
        url: evoApiUrl + "/instance/connectionState/" + instanceName,
        method: "GET",
        headers: { "apikey": evoApiKey },
        timeout: 3,
      });
      if (cRes.statusCode >= 200 && cRes.statusCode < 300) {
        const d = cRes.json;
        if ((d && (d.instance ? d.instance.state : d.state)) === "open") isTargetOpen = true;
      }
    } catch (_) {}

    if (!isTargetOpen) {
      try {
        const fRes = $http.send({
          url: evoApiUrl + "/instance/fetchInstances",
          method: "GET",
          headers: { "apikey": evoApiKey },
          timeout: 4,
        });
        if (fRes.statusCode >= 200 && fRes.statusCode < 300 && Array.isArray(fRes.json)) {
          const allInstances = fRes.json;
          for (let k = 0; k < allInstances.length; k++) {
            if (allInstances[k].connectionStatus === "open") {
              instanceName = allInstances[k].name;
              break;
            }
          }
        }
      } catch (_) {}
    }

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
            delay: 3000,
          }),
          timeout: 6,
        });
        sleep(3000);
      } catch (_) {}
    }

    const sendRes = $http.send({
      url: evoApiUrl + "/message/sendText/" + instanceName,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "apikey": evoApiKey,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: finalConfirmMessage,
      }),
      timeout: 20,
    });

    const isSent = sendRes.statusCode >= 200 && sendRes.statusCode < 300;

    // Gravar auditoria da confirmação
    const colHistorico = $app.findCollectionByNameOrId("historico_mensagens_whatsapp");
    if (colHistorico && barbearia) {
      try {
        const logRec = new Record(colHistorico);
        logRec.set("barbearia_id", barbeariaId);
        logRec.set("cliente_nome", clienteNome);
        logRec.set("cliente_telefone", cleanPhone);
        logRec.set("tipo_evento", "confirmacao_agendamento");
        logRec.set("mensagem", finalConfirmMessage);
        logRec.set("status", isSent ? "enviado" : "falha");
        logRec.set("delay_aplicado", delayConfigured);
        logRec.set("simulou_digitando", simularDigitando);
        logRec.set("evolution_response", sendRes.json || { raw: sendRes.raw });
        $app.save(logRec);
      } catch (_) {}

      // 2. Também agendar automaticamente o Lembrete de 2h antes (se o horário for futuro > 2h)
      try {
        if (dataRaw && horarioRaw) {
          const isoStr = dataRaw + "T" + horarioRaw + ":00-03:00";
          const apptMs = Date.parse(isoStr);
          const reminderMs = apptMs - (2 * 60 * 60 * 1000);
          if (!isNaN(reminderMs) && reminderMs > Date.now() + 5 * 60 * 1000) {
            let tplRem = null;
            try {
              tplRem = $app.findFirstRecordByFilter(
                "templates_mensagens",
                "barbearia_id = {:bid} && tipo_evento = 'lembrete_2h'",
                { bid: barbeariaId }
              );
            } catch (_) {}

            if (!tplRem || tplRem.get("ativo") !== false) {
              const remContent = tplRem
                ? tplRem.get("conteudo")
                : "Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.";
              const finalRemMsg = remContent
                .replace(/\{nome_cliente\}/g, clienteNome)
                .replace(/\{barbeiro\}/g, barbeiroNome)
                .replace(/\{horario\}/g, horarioRaw)
                .replace(/\{data\}/g, dataFormatada)
                .replace(/\{servico\}/g, servicoNome)
                .replace(/\{beneficio_clube\}/g, beneficioClube);

              const remRec = new Record(colHistorico);
              remRec.set("barbearia_id", barbeariaId);
              remRec.set("cliente_nome", clienteNome);
              remRec.set("cliente_telefone", cleanPhone);
              remRec.set("tipo_evento", "lembrete_2h");
              remRec.set("mensagem", finalRemMsg);
              remRec.set("status", "agendado");
              remRec.set("delay_aplicado", 7200);
              remRec.set("simulou_digitando", true);
              remRec.set("evolution_response", {
                scheduledFor: reminderMs,
                scheduledForIso: new Date(reminderMs).toISOString(),
                agendamentoRef: agendamentoId,
              });
              $app.save(remRec);
            }
          }
        }
      } catch (_) {}
    }

    return e.json(200, {
      success: isSent,
      instanceName: instanceName,
      message: isSent ? "Confirmação enviada via WhatsApp com sucesso!" : "Falha ao enviar confirmação via WhatsApp",
    });
  } catch (err) {
    console.error("[BookingCreated Worker] Erro:", err);
    return e.json(500, { error: String(err) });
  }
});

// 10.8. Endpoints de Sincronização em Nuvem Multi-Dispositivo (Celular + Notebook + Proprietário + Barbeiro)
routerAdd("GET", "/api/barbearia/cloud-state", (e) => {
  try {
    const records = $app.findRecordsByFilter(
      "sistema_estado_global",
      "chave = 'naville_prod_v2'",
      "-id",
      1,
      0
    );
    if (records && records.length > 0) {
      let raw = records[0].get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      return e.json(200, { success: true, found: true, state: dados });
    }
    return e.json(200, { success: true, found: false, state: null });
  } catch (err) {
    return e.json(200, { success: false, found: false, state: null, error: String(err) });
  }
});

routerAdd("POST", "/api/barbearia/cloud-state", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const stateObj = body.state || body;
    const col = $app.findCollectionByNameOrId("sistema_estado_global");
    let rec = null;
    try {
      const list = $app.findRecordsByFilter(
        "sistema_estado_global",
        "chave = 'naville_prod_v2'",
        "-id",
        1,
        0
      );
      if (list && list.length > 0) rec = list[0];
    } catch (_) {}

    if (!rec) {
      rec = new Record(col);
      rec.set("chave", "naville_prod_v2");
    }
    rec.set("dados", typeof stateObj === "string" ? stateObj : JSON.stringify(stateObj));
    $app.save(rec);

    // Também garante que todas as barbearias da lista existam na coleção barbearias
    if (Array.isArray(stateObj.tenants)) {
      const colBarb = $app.findCollectionByNameOrId("barbearias");
      for (let i = 0; i < stateObj.tenants.length; i++) {
        const t = stateObj.tenants[i];
        if (!t || !t.slug) continue;
        try {
          const existing = $app.findRecordsByFilter("barbearias", "slug = {:s}", "", 1, 0, { s: t.slug });
          if (!existing || existing.length === 0) {
            const bRec = new Record(colBarb);
            bRec.set("name", t.name || t.slug);
            bRec.set("nome_fantasia", t.nome_fantasia || t.name || t.slug);
            bRec.set("slug", t.slug);
            bRec.set("owner_name", t.ownerName || "");
            bRec.set("owner_phone", t.ownerPhone || "");
            bRec.set("status", t.status || "active");
            $app.save(bRec);
          }
        } catch (_) {}
      }
    }

    return e.json(200, { success: true });
  } catch (err) {
    console.error("[CloudState] Erro ao salvar estado:", err);
    return e.json(500, { error: String(err) });
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
      const state = body?.data?.state || (body?.data?.status === "open" ? "open" : "close");
      if (records && records.length > 0) {
        const barbearia = records[0];
        barbearia.set("whatsapp_status", state);
        $app.save(barbearia);
      } else if (state === "open") {
        try {
          const defaultBarbearia = $app.findRecordById("barbearias", "kd2eakh5cijm61x");
          if (defaultBarbearia) {
            defaultBarbearia.set("evolution_instance_name", instance);
            defaultBarbearia.set("whatsapp_status", "open");
            $app.save(defaultBarbearia);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error("Erro no webhook CONNECTION_UPDATE:", err);
    }
  }

  return e.json(200, { received: true });
});

// 12. Endpoint Oficial Stripe Central SaaS: Status & Criação de Checkout Session (LIVE PRODUÇÃO)
routerAdd("GET", "/api/stripe/status", (e) => {
  return e.json(200, {
    connected: true,
    livemode: true,
    publishableKey: "pk_live_51UU7ULAYbheZsaA8wCPcCVLkWBQ7waH9Taj2pVRYdxT621dsMawOO1D1ojZSBc2NXPr5WDuSSAl3gYPoqgJvO57C00vOZsIYMQ",
    accountName: "Naville Barber SaaS (Oficial)",
    currency: "brl",
    supportedPaymentMethods: ["card", "boleto"],
  });
});

routerAdd("POST", "/api/stripe/create-checkout-session", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const tenantId = body.tenantId || "";
    const slug = body.slug || "";
    const tenantName = body.tenantName || "";
    const planId = body.planId || "pro";
    const billingCycle = body.billingCycle || "mensal";
    const amountCents = body.amountCents || 8990;
    const origin = "https://navillebarber.pro";
    const successUrl = body.successUrl || (origin + "/admin?stripe_payment=success&session_id={CHECKOUT_SESSION_ID}");
    const cancelUrl = body.cancelUrl || (origin + "/admin?stripe_payment=cancelled");

    const stripeSecretKey = $os.getenv("STRIPE_SECRET_KEY") || "";

    const payload = [
      "mode=payment",
      "success_url=" + encodeURIComponent(successUrl),
      "cancel_url=" + encodeURIComponent(cancelUrl),
      "client_reference_id=" + encodeURIComponent(tenantId || slug || "naville_tenant"),
      "line_items[0][price_data][currency]=brl",
      "line_items[0][price_data][unit_amount]=" + amountCents,
      "line_items[0][price_data][product_data][name]=" + encodeURIComponent("Naville SaaS " + String(planId).toUpperCase() + " (" + billingCycle + ")"),
      "line_items[0][price_data][product_data][description]=" + encodeURIComponent("Assinatura SaaS Barbearia - " + (tenantName || slug)),
      "line_items[0][quantity]=1",
      "metadata[tenantId]=" + encodeURIComponent(tenantId),
      "metadata[slug]=" + encodeURIComponent(slug),
      "metadata[planId]=" + encodeURIComponent(planId),
      "metadata[billingCycle]=" + encodeURIComponent(billingCycle)
    ].join("&");

    const res = $http.send({
      url: "https://api.stripe.com/v1/checkout/sessions",
      method: "POST",
      headers: {
        "Authorization": "Bearer " + stripeSecretKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload,
      timeout: 15
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const data = res.json;
      return e.json(200, {
        success: true,
        sessionId: data.id,
        checkoutUrl: data.url,
        amountTotal: data.amount_total,
        currency: data.currency
      });
    } else {
      console.error("Erro no Stripe API:", res.raw);
      return e.json(res.statusCode, {
        success: false,
        error: res.json?.error?.message || "Erro na API do Stripe"
      });
    }
  } catch (err) {
    console.error("Erro interno no checkout Stripe:", err);
    return e.json(500, { success: false, error: String(err) });
  }
});

// 13. Sincronização & Registro Automático de Pagamentos Stripe no Cloud State

// 13.1. Endpoint para sincronizar pagamentos recentes da Stripe automaticamente
routerAdd("GET", "/api/stripe/sync-recent-payments", (e) => {

  const processPaidSession = function(session) {
    if (!session || session.payment_status !== "paid") return null;
    try {
      const list = $app.findRecordsByFilter("sistema_estado_global", "chave = 'naville_prod_v2'", "-id", 1, 0);
      if (!list || list.length === 0) return null;

      const rec = list[0];
      let raw = rec.get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];

      const tenantId = (session.metadata && session.metadata.tenantId) || session.client_reference_id || "tenant-barber-ls";
      const slug = (session.metadata && session.metadata.slug) || tenantId;
      const amountVal = (session.amount_total ? session.amount_total / 100 : 89.9);
      const paidAt = session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString();

      let targetTenant = null;
      for (let i = 0; i < dados.tenants.length; i++) {
        const t = dados.tenants[i];
        if (t.id === tenantId || t.slug === slug || t.slug === tenantId) {
          targetTenant = t;
          break;
        }
      }
      const tenantName = targetTenant ? targetTenant.name : (session.customer_details ? session.customer_details.name : "BARBER LS");
      const ownerName = targetTenant ? (targetTenant.ownerName || targetTenant.nome_responsavel || "Proprietário") : "Proprietário";
      const ownerPhone = targetTenant ? (targetTenant.ownerPhone || targetTenant.whatsapp_financeiro || "") : "";

      let existingInv = null;
      for (let i = 0; i < dados.invoices.length; i++) {
        const inv = dados.invoices[i];
        if (inv.stripePaymentId === session.id || inv.id === ("inv-stripe-" + session.id)) {
          existingInv = inv;
          break;
        }
      }

      if (!existingInv) {
        const invNumber = "INV-" + new Date().getFullYear() + "-" + session.id.slice(-6).toUpperCase();
        existingInv = {
          id: "inv-stripe-" + session.id,
          tenantId: targetTenant ? targetTenant.id : tenantId,
          tenantName: tenantName,
          invoiceNumber: invNumber,
          amount: amountVal,
          status: "paid",
          issueDate: paidAt.split("T")[0],
          dueDate: paidAt.split("T")[0],
          paidAt: paidAt,
          pago_em: paidAt,
          paymentMethod: "stripe",
          stripePaymentId: session.id,
          items: [
            {
              description: "Assinatura Naville SaaS Plano " + ((session.metadata && session.metadata.planId) ? session.metadata.planId.toUpperCase() : "PRO") + " - Cartão de Crédito (Stripe)",
              quantity: 1,
              unitPrice: amountVal,
              total: amountVal
            }
          ]
        };
        dados.invoices.unshift(existingInv);
      } else {
        existingInv.status = "paid";
        existingInv.paidAt = paidAt;
        existingInv.pago_em = paidAt;
        existingInv.paymentMethod = "stripe";
        existingInv.stripePaymentId = session.id;
      }

      // Estende vencimento em 30 dias e reativa o sistema
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextDateStr = nextDate.toISOString().split("T")[0];

      if (targetTenant) {
        targetTenant.status = "active";
        targetTenant.status_assinatura = "ativo";
        targetTenant.nextBillingDate = nextDateStr;
        targetTenant.data_proximo_vencimento = nextDateStr;
      }

      rec.set("dados", JSON.stringify(dados));
      $app.save(rec);

      // Atualiza tabela barbearias no SQLite
      try {
        const barbs = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:i}", "", 1, 0, { s: slug, i: tenantId });
        if (barbs && barbs.length > 0) {
          const b = barbs[0];
          b.set("status", "active");
          b.set("status_assinatura", "ativo");
          $app.save(b);
        }
      } catch (_) {}

      // Dispara Notificação Oficial via WhatsApp para o dono da barbearia
      if (ownerPhone && ownerPhone.length >= 8) {
        try {
          let cleanPhone = ownerPhone.replace(/\D/g, "");
          if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = "55" + cleanPhone;

          const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
          const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";
          const instanceName = "naville_barbearia_" + (slug || "master");

          const msg = "💈 *Naville Barber SaaS - Pagamento Confirmado!*\n\n" +
            "Olá, *" + ownerName + "*! Confirmamos com sucesso a compensação da sua mensalidade referente à barbearia *" + tenantName + "* via Cartão de Crédito (Stripe).\n\n" +
            "✅ *Status:* Assinatura Ativa (Em Dia)\n" +
            "📅 *Próxima Renovação:* " + nextDateStr.split("-").reverse().join("/") + "\n" +
            "🧾 *Recibo Oficial:* Já disponível no seu painel em *Minha Assinatura*.\n\n" +
            "Seu sistema e agendamento online público (/b/" + slug + ") continuam 100% ativos e operando normalmente. Obrigado pela parceria! 🤝";

          $http.send({
            url: evoApiUrl + "/message/sendText/" + instanceName,
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "apikey": evoApiKey
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: msg
            }),
            timeout: 6
          });
        } catch (errWa) {
          console.warn("[Stripe WhatsApp Alert] Falha ao enviar comprovante no WhatsApp:", errWa);
        }
      }

      return existingInv;
    } catch (errSync) {
      console.error("[Stripe Sync] Erro interno:", errSync);
      return null;
    }
  };

  const stripeSecretKey = $os.getenv("STRIPE_SECRET_KEY") || "";
  try {
    const res = $http.send({
      url: "https://api.stripe.com/v1/checkout/sessions?limit=10",
      method: "GET",
      headers: {
        "Authorization": "Bearer " + stripeSecretKey
      },
      timeout: 15
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const data = res.json;
      let count = 0;
      if (data && Array.isArray(data.data)) {
        for (let i = 0; i < data.data.length; i++) {
          const sess = data.data[i];
          if (sess.payment_status === "paid") {
            processPaidSession(sess);
            count++;
          }
        }
      }
      return e.json(200, { success: true, syncedCount: count });
    }
    return e.json(res.statusCode, { success: false, error: res.raw });
  } catch (err) {
    return e.json(500, { success: false, error: String(err) });
  }
});

// 13.2. Endpoint para verificar sessão única do Stripe e dar baixa automática
routerAdd("GET", "/api/stripe/verify-session", (e) => {

  const processPaidSession = function(session) {
    if (!session || session.payment_status !== "paid") return null;
    try {
      const list = $app.findRecordsByFilter("sistema_estado_global", "chave = 'naville_prod_v2'", "-id", 1, 0);
      if (!list || list.length === 0) return null;

      const rec = list[0];
      let raw = rec.get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];

      const tenantId = (session.metadata && session.metadata.tenantId) || session.client_reference_id || "tenant-barber-ls";
      const slug = (session.metadata && session.metadata.slug) || tenantId;
      const amountVal = (session.amount_total ? session.amount_total / 100 : 89.9);
      const paidAt = session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString();

      let targetTenant = null;
      for (let i = 0; i < dados.tenants.length; i++) {
        const t = dados.tenants[i];
        if (t.id === tenantId || t.slug === slug || t.slug === tenantId) {
          targetTenant = t;
          break;
        }
      }
      const tenantName = targetTenant ? targetTenant.name : (session.customer_details ? session.customer_details.name : "BARBER LS");
      const ownerName = targetTenant ? (targetTenant.ownerName || targetTenant.nome_responsavel || "Proprietário") : "Proprietário";
      const ownerPhone = targetTenant ? (targetTenant.ownerPhone || targetTenant.whatsapp_financeiro || "") : "";

      let existingInv = null;
      for (let i = 0; i < dados.invoices.length; i++) {
        const inv = dados.invoices[i];
        if (inv.stripePaymentId === session.id || inv.id === ("inv-stripe-" + session.id)) {
          existingInv = inv;
          break;
        }
      }

      if (!existingInv) {
        const invNumber = "INV-" + new Date().getFullYear() + "-" + session.id.slice(-6).toUpperCase();
        existingInv = {
          id: "inv-stripe-" + session.id,
          tenantId: targetTenant ? targetTenant.id : tenantId,
          tenantName: tenantName,
          invoiceNumber: invNumber,
          amount: amountVal,
          status: "paid",
          issueDate: paidAt.split("T")[0],
          dueDate: paidAt.split("T")[0],
          paidAt: paidAt,
          pago_em: paidAt,
          paymentMethod: "stripe",
          stripePaymentId: session.id,
          items: [
            {
              description: "Assinatura Naville SaaS Plano " + ((session.metadata && session.metadata.planId) ? session.metadata.planId.toUpperCase() : "PRO") + " - Cartão de Crédito (Stripe)",
              quantity: 1,
              unitPrice: amountVal,
              total: amountVal
            }
          ]
        };
        dados.invoices.unshift(existingInv);
      } else {
        existingInv.status = "paid";
        existingInv.paidAt = paidAt;
        existingInv.pago_em = paidAt;
        existingInv.paymentMethod = "stripe";
        existingInv.stripePaymentId = session.id;
      }

      // Estende vencimento em 30 dias e reativa o sistema
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextDateStr = nextDate.toISOString().split("T")[0];

      if (targetTenant) {
        targetTenant.status = "active";
        targetTenant.status_assinatura = "ativo";
        targetTenant.nextBillingDate = nextDateStr;
        targetTenant.data_proximo_vencimento = nextDateStr;
      }

      rec.set("dados", JSON.stringify(dados));
      $app.save(rec);

      // Atualiza tabela barbearias no SQLite
      try {
        const barbs = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:i}", "", 1, 0, { s: slug, i: tenantId });
        if (barbs && barbs.length > 0) {
          const b = barbs[0];
          b.set("status", "active");
          b.set("status_assinatura", "ativo");
          $app.save(b);
        }
      } catch (_) {}

      // Dispara Notificação Oficial via WhatsApp para o dono da barbearia
      if (ownerPhone && ownerPhone.length >= 8) {
        try {
          let cleanPhone = ownerPhone.replace(/\D/g, "");
          if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = "55" + cleanPhone;

          const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
          const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";
          const instanceName = "naville_barbearia_" + (slug || "master");

          const msg = "💈 *Naville Barber SaaS - Pagamento Confirmado!*\n\n" +
            "Olá, *" + ownerName + "*! Confirmamos com sucesso a compensação da sua mensalidade referente à barbearia *" + tenantName + "* via Cartão de Crédito (Stripe).\n\n" +
            "✅ *Status:* Assinatura Ativa (Em Dia)\n" +
            "📅 *Próxima Renovação:* " + nextDateStr.split("-").reverse().join("/") + "\n" +
            "🧾 *Recibo Oficial:* Já disponível no seu painel em *Minha Assinatura*.\n\n" +
            "Seu sistema e agendamento online público (/b/" + slug + ") continuam 100% ativos e operando normalmente. Obrigado pela parceria! 🤝";

          $http.send({
            url: evoApiUrl + "/message/sendText/" + instanceName,
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "apikey": evoApiKey
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: msg
            }),
            timeout: 6
          });
        } catch (errWa) {
          console.warn("[Stripe WhatsApp Alert] Falha ao enviar comprovante no WhatsApp:", errWa);
        }
      }

      return existingInv;
    } catch (errSync) {
      console.error("[Stripe Sync] Erro interno:", errSync);
      return null;
    }
  };

  const query = e.requestInfo().query || {};
  const sessionId = query.session_id;
  if (!sessionId) return e.json(400, { error: "session_id obrigatorio" });

  const stripeSecretKey = $os.getenv("STRIPE_SECRET_KEY") || "";
  try {
    const res = $http.send({
      url: "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId),
      method: "GET",
      headers: {
        "Authorization": "Bearer " + stripeSecretKey
      },
      timeout: 15
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const sess = res.json;
      if (sess && sess.payment_status === "paid") {
        const inv = processPaidSession(sess);
        return e.json(200, { success: true, paid: true, invoice: inv, session: sess });
      }
      return e.json(200, { success: true, paid: false, status: sess.payment_status });
    }
    return e.json(res.statusCode, { success: false, error: res.raw });
  } catch (err) {
    return e.json(500, { success: false, error: String(err) });
  }
});

// 13.3. Endpoint de Webhook oficial para eventos do Stripe
routerAdd("POST", "/api/webhooks/stripe", (e) => {

  const processPaidSession = function(session) {
    if (!session || session.payment_status !== "paid") return null;
    try {
      const list = $app.findRecordsByFilter("sistema_estado_global", "chave = 'naville_prod_v2'", "-id", 1, 0);
      if (!list || list.length === 0) return null;

      const rec = list[0];
      let raw = rec.get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];

      const tenantId = (session.metadata && session.metadata.tenantId) || session.client_reference_id || "tenant-barber-ls";
      const slug = (session.metadata && session.metadata.slug) || tenantId;
      const amountVal = (session.amount_total ? session.amount_total / 100 : 89.9);
      const paidAt = session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString();

      let targetTenant = null;
      for (let i = 0; i < dados.tenants.length; i++) {
        const t = dados.tenants[i];
        if (t.id === tenantId || t.slug === slug || t.slug === tenantId) {
          targetTenant = t;
          break;
        }
      }
      const tenantName = targetTenant ? targetTenant.name : (session.customer_details ? session.customer_details.name : "BARBER LS");
      const ownerName = targetTenant ? (targetTenant.ownerName || targetTenant.nome_responsavel || "Proprietário") : "Proprietário";
      const ownerPhone = targetTenant ? (targetTenant.ownerPhone || targetTenant.whatsapp_financeiro || "") : "";

      let existingInv = null;
      for (let i = 0; i < dados.invoices.length; i++) {
        const inv = dados.invoices[i];
        if (inv.stripePaymentId === session.id || inv.id === ("inv-stripe-" + session.id)) {
          existingInv = inv;
          break;
        }
      }

      if (!existingInv) {
        const invNumber = "INV-" + new Date().getFullYear() + "-" + session.id.slice(-6).toUpperCase();
        existingInv = {
          id: "inv-stripe-" + session.id,
          tenantId: targetTenant ? targetTenant.id : tenantId,
          tenantName: tenantName,
          invoiceNumber: invNumber,
          amount: amountVal,
          status: "paid",
          issueDate: paidAt.split("T")[0],
          dueDate: paidAt.split("T")[0],
          paidAt: paidAt,
          pago_em: paidAt,
          paymentMethod: "stripe",
          stripePaymentId: session.id,
          items: [
            {
              description: "Assinatura Naville SaaS Plano " + ((session.metadata && session.metadata.planId) ? session.metadata.planId.toUpperCase() : "PRO") + " - Cartão de Crédito (Stripe)",
              quantity: 1,
              unitPrice: amountVal,
              total: amountVal
            }
          ]
        };
        dados.invoices.unshift(existingInv);
      } else {
        existingInv.status = "paid";
        existingInv.paidAt = paidAt;
        existingInv.pago_em = paidAt;
        existingInv.paymentMethod = "stripe";
        existingInv.stripePaymentId = session.id;
      }

      // Estende vencimento em 30 dias e reativa o sistema
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextDateStr = nextDate.toISOString().split("T")[0];

      if (targetTenant) {
        targetTenant.status = "active";
        targetTenant.status_assinatura = "ativo";
        targetTenant.nextBillingDate = nextDateStr;
        targetTenant.data_proximo_vencimento = nextDateStr;
      }

      rec.set("dados", JSON.stringify(dados));
      $app.save(rec);

      // Atualiza tabela barbearias no SQLite
      try {
        const barbs = $app.findRecordsByFilter("barbearias", "slug = {:s} || id = {:i}", "", 1, 0, { s: slug, i: tenantId });
        if (barbs && barbs.length > 0) {
          const b = barbs[0];
          b.set("status", "active");
          b.set("status_assinatura", "ativo");
          $app.save(b);
        }
      } catch (_) {}

      // Dispara Notificação Oficial via WhatsApp para o dono da barbearia
      if (ownerPhone && ownerPhone.length >= 8) {
        try {
          let cleanPhone = ownerPhone.replace(/\D/g, "");
          if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = "55" + cleanPhone;

          const evoApiUrl = $os.getenv("EVOLUTION_API_URL") || "http://evolution-api:8080";
          const evoApiKey = $os.getenv("EVOLUTION_API_KEY") || "4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1";
          const instanceName = "naville_barbearia_" + (slug || "master");

          const msg = "💈 *Naville Barber SaaS - Pagamento Confirmado!*\n\n" +
            "Olá, *" + ownerName + "*! Confirmamos com sucesso a compensação da sua mensalidade referente à barbearia *" + tenantName + "* via Cartão de Crédito (Stripe).\n\n" +
            "✅ *Status:* Assinatura Ativa (Em Dia)\n" +
            "📅 *Próxima Renovação:* " + nextDateStr.split("-").reverse().join("/") + "\n" +
            "🧾 *Recibo Oficial:* Já disponível no seu painel em *Minha Assinatura*.\n\n" +
            "Seu sistema e agendamento online público (/b/" + slug + ") continuam 100% ativos e operando normalmente. Obrigado pela parceria! 🤝";

          $http.send({
            url: evoApiUrl + "/message/sendText/" + instanceName,
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "apikey": evoApiKey
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: msg
            }),
            timeout: 6
          });
        } catch (errWa) {
          console.warn("[Stripe WhatsApp Alert] Falha ao enviar comprovante no WhatsApp:", errWa);
        }
      }

      return existingInv;
    } catch (errSync) {
      console.error("[Stripe Sync] Erro interno:", errSync);
      return null;
    }
  };

  const body = e.requestInfo().body || {};
  console.log("Stripe Webhook recebido:", body?.type);

  if (body?.type === "checkout.session.completed") {
    const sessionObj = body.data?.object;
    if (sessionObj) {
      processPaidSession(sessionObj);
    }
  }

  return e.json(200, { received: true, eventType: body?.type });
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
