const ContaReceber = use("App/Models/ContaReceber");
const ContaReceberParcela = use("App/Models/ContaReceberParcela");
const { DateTime } = require("luxon");
const Database = use("Database");

class ContaReceberController {
  async getTotais({ request, response }) {
    try {
      const result = await this.calcularTotais(request.all());

      return response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("ERRO ao buscar totais:", error);
      return response.status(500).send({
        error: "Erro ao buscar totais",
        details: error.message,
      });
    }
  }

  async store({ request, response, auth }) {
    try {
      await auth.check();

      const rawData = request.all();

      const data = {
        nome: rawData.nome || rawData.none,
        custo_fixo: rawData.custo_fixo || false,
        custo_variavel:
          rawData.custo_variavel || rawData.custo_variate1 || false,
        prestador_id: rawData.prestador_id,
        categoria_id: rawData.categoria_id,
        data_inicio: rawData.data_inicio,
        quantidade_parcelas: rawData.quantidade_parcelas,
        valor_mensal: rawData.valor_mensal,
        valor_total: rawData.valor_total,
        forma_pagamento: rawData.forma_pagamento,
      };

      if (!data.nome) {
        return response
          .status(400)
          .send({ error: "Campo 'nome' é obrigatório" });
      }

      if (!data.custo_fixo && !data.custo_variavel) {
        return response.status(400).send({
          error: "Selecione se é custo fixo ou variável",
          received_data: rawData,
        });
      }

      if (data.custo_variavel && !data.forma_pagamento) {
        return response.status(400).send({
          error: "Forma de pagamento é obrigatória para custo variável",
        });
      }

      if (data.custo_fixo) {
        if (!data.valor_mensal) {
          return response.status(400).send({
            error: "valor_mensal é obrigatório para custo fixo",
          });
        }
        if (!data.quantidade_parcelas || data.quantidade_parcelas < 1) {
          return response.status(400).send({
            error: "quantidade_parcelas deve ser maior que zero",
          });
        }
      }

      if (data.custo_variavel) {
        if (!data.valor_total) {
          return response.status(400).send({
            error: "valor_total é obrigatório para custo variável",
          });
        }
      }

      data.status = 1;

      const conta = await ContaReceber.create(data);

      const parcelas = [];
      const inicio = DateTime.fromISO(data.data_inicio);

      if (data.custo_fixo) {
        const quantidadeParcelas = parseInt(data.quantidade_parcelas);
        const fim = inicio.plus({ months: quantidadeParcelas - 1 });

        conta.merge({ data_fim: fim.toISODate() });
        await conta.save();

        for (let i = 0; i < quantidadeParcelas; i++) {
          const vencimento = inicio.plus({ months: i });
          parcelas.push({
            conta_receber_id: conta.id,
            descricao: `Parcela ${i + 1}/${quantidadeParcelas}`,
            data_vencimento: vencimento.toISODate(),
            valor: parseFloat(data.valor_mensal),
            status: 1,
            status_pagamento: 1,
          });
        }
      } else {
        parcelas.push({
          conta_receber_id: conta.id,
          descricao: "Parcela única",
          data_vencimento: inicio.toISODate(),
          valor: parseFloat(data.valor_total),
          status: 1,
          status_pagamento: 1,
          forma_pagamento: data.forma_pagamento,
        });
      }

      await ContaReceberParcela.createMany(parcelas);

      await conta.loadMany(["parcelas", "categoria", "prestador"]);

      return response.status(201).send(conta);
    } catch (error) {
      console.error("ERRO DETALHADO:", {
        message: error.message,
        stack: error.stack,
        rawData: request.all(),
      });

      return response.status(500).send({
        error: "Erro ao processar requisição",
        details:
          process.env.NODE_ENV === "development"
            ? {
                message: error.message,
                stack: error.stack,
                received_data: request.all(),
              }
            : null,
      });
    }
  }
  async index({ request, response }) {
    try {
      const {
        page = 1,
        perPage = 10,
        sortBy = "data_inicio",
        sortOrder = "desc",
        search,
        status,
        data_inicio,
        data_fim,
        custo_fixo,
        custo_variavel,
      } = request.all();

      const query = ContaReceber.query().select(
        "id",
        "nome",
        "data_inicio",
        "data_fim",
        "valor_total",
        "valor_mensal",
        "status",
        "custo_fixo",
        "custo_variavel",
      );

      if (status) {
        query.where("status", status);
      }

      if (custo_fixo === "true" || custo_fixo === true || custo_fixo === "1") {
        query.where("custo_fixo", true);
      } else if (custo_fixo === "false" || custo_fixo === false || custo_fixo === "0") {
        query.where((builder) => builder.where("custo_fixo", false).orWhereNull("custo_fixo"));
      }

      if (custo_variavel === "true" || custo_variavel === true || custo_variavel === "1") {
        query.where("custo_variavel", true);
      } else if (custo_variavel === "false" || custo_variavel === false || custo_variavel === "0") {
        query.where((builder) => builder.where("custo_variavel", false).orWhereNull("custo_variavel"));
      }

      if (data_inicio) {
        query.where("data_inicio", ">=", data_inicio);
      }

      if (data_fim) {
        query.where("data_inicio", "<=", data_fim);
      }

      if (search) {
        query.where("nome", "ILIKE", `%${search}%`);
      }

      const allowedSortFields = ["nome", "data_inicio", "valor_total", "status"];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "data_inicio";

      if (safeSortBy === "valor_total") {
        query.orderByRaw("COALESCE(valor_total, valor_mensal) " + sortOrder);
      } else {
        query.orderBy(safeSortBy, sortOrder);
      }

      const hoje = DateTime.now().startOf("day");
      const contasComParcelas = await query.with("parcelas").paginate(page, perPage);
      const formattedData = contasComParcelas.toJSON();

      formattedData.data = formattedData.data.map((conta) => {
        const parcelas = conta.parcelas || [];
        const todasPagas = parcelas.length > 0 && parcelas.every((p) => p.status_pagamento === 2);
        const temAtrasadas = parcelas.some((p) => p.status_pagamento === 1 && DateTime.fromISO(p.data_vencimento).startOf("day") < hoje);
        const temPagas = parcelas.some((p) => p.status_pagamento === 2);

        let status_pagamento;
        let status_label;

        if (todasPagas) {
          status_pagamento = 2; // Pago
          status_label = "Pago";
        } else if (temAtrasadas) {
          status_pagamento = 3; // Atrasado
          status_label = "Atrasado";
        } else if (temPagas) {
          status_pagamento = 4; // Em andamento
          status_label = "Em andamento";
        } else {
          status_pagamento = 1; // Pendente
          status_label = "Pendente";
        }

        return {
          id: conta.id,
          nome: conta.nome,
          data: conta.data_inicio,
          valor: conta.custo_fixo ? parseFloat(conta.valor_mensal) : parseFloat(conta.valor_total),
          status_pagamento: status_pagamento,
          status_label: status_label,
          custo_fixo: conta.custo_fixo,
          custo_variavel: conta.custo_variavel,
        };
      });

      return response.json(formattedData);
    } catch (error) {
      console.error("Erro ao listar contas:", error);
      return response.status(500).send({
        error: "Erro ao listar contas",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  getStatusLabel(status) {
    const statusMap = {
      1: "Pendente",
      2: "Pago",
      3: "Atrasado",
      4: "Em Andamento",
      5: "Cancelado",
    };
    return statusMap[status] || "Desconhecido";
  }
  async show({ params, response }) {
    try {
      await this.atualizarStatusConta(params.id);

      const conta = await ContaReceber.query()
        .where("id", params.id)
        .with("parcelas", (builder) => {
          builder.orderBy("data_vencimento", "asc");
        })
        .with("categoria")
        .with("prestador")
        .first();

      if (!conta) {
        return response.status(404).send({ error: "Conta não encontrada" });
      }

      const contaJSON = conta.toJSON();
      const hoje = DateTime.now().startOf("day");

      const parcelasProcessadas = contaJSON.parcelas.map((parcela) => {
        const dataVencimento = DateTime.fromISO(
          parcela.data_vencimento,
        ).startOf("day");
        const estaVencida =
          parcela.status_pagamento !== 2 && dataVencimento < hoje;

        return {
          ...parcela,
          esta_vencida: estaVencida,
          dias_vencidos: estaVencida
            ? Math.floor(hoje.diff(dataVencimento, "days").days)
            : 0,
          status_pagamento_texto:
            parcela.status_pagamento === 1 ? "Pendente" : "Pago",
        };
      });

      const resumoParcelas = {
        total: parcelasProcessadas.length,
        pagas: parcelasProcessadas.filter((p) => p.status_pagamento === 2)
          .length,
        pendentes: parcelasProcessadas.filter((p) => p.status_pagamento === 1)
          .length,
        vencidas: parcelasProcessadas.filter((p) => p.esta_vencida).length,
        valor_total: parcelasProcessadas.reduce(
          (acc, p) => acc + parseFloat(p.valor || 0),
          0,
        ),
        valor_pago: parcelasProcessadas
          .filter((p) => p.status_pagamento === 2)
          .reduce((acc, p) => acc + parseFloat(p.valor || 0), 0),
        valor_pendente: parcelasProcessadas
          .filter((p) => p.status_pagamento === 1)
          .reduce((acc, p) => acc + parseFloat(p.valor || 0), 0),
        valor_vencido: parcelasProcessadas
          .filter((p) => p.esta_vencida)
          .reduce((acc, p) => acc + parseFloat(p.valor || 0), 0),
      };

      const todasPagas = parcelasProcessadas.every((p) => p.status_pagamento === 2);

      const responseData = {
        ...contaJSON,
        parcelas: parcelasProcessadas,
        status_consolidado: {
          codigo: contaJSON.status,
          label: this.getStatusLabel(contaJSON.status),
        },
        resumo_parcelas: resumoParcelas,
        pode_ser_paga: !todasPagas,
      };

      return response.json(responseData);
    } catch (error) {
      console.error("Erro ao buscar conta:", error);
      return response.status(500).send({
        error: "Erro ao buscar conta",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  async update({ params, request }) {
    const data = request.only([
      "nome",
      "custo_fixo",
      "custo_variavel",
      "prestador_id",
      "categoria_id",
      "data_inicio",
      "data_fim",
      "valor_total",
      "valor_mensal",
      "status_pagamento",
      "forma_pagamento",
    ]);

    const conta = await ContaReceber.find(params.id);

    if (data.status_pagamento) {
      data.status_geral = data.status_pagamento;
    }

    conta.merge(data);
    await conta.save();

    if (conta.custo_variavel) {
      const parcela = await ContaReceberParcela.query()
        .where("conta_receber_id", params.id)
        .first();

      if (parcela) {
        parcela.merge({
          status: data.status_pagamento || conta.status_geral,
          status_pagamento: data.status_pagamento || conta.status_geral,
          data_pagamento:
            data.status_pagamento === 2 ? new Date().toISOString() : null,
          forma_pagamento: data.forma_pagamento,
        });
        await parcela.save();
      }
    }

    return conta;
  }
  async pagarParcela({ params, request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const parcela = await ContaReceberParcela.find(params.id);

      if (!parcela) {
        return response.status(404).send({ error: "Parcela não encontrada" });
      }

      if (parcela.status_pagamento === 2) {
        return response.status(400).send({ error: "Parcela já está paga" });
      }

      parcela.status = 2;
      parcela.data_pagamento = new Date();
      parcela.forma_pagamento =
        request.input("forma_pagamento") || parcela.forma_pagamento;

      await parcela.save(trx);

      await this.atualizarStatusConta(parcela.conta_receber_id, trx);

      // --- SINCRONIZAÇÃO COM PALESTRAS ---
      const conta = await ContaReceber.find(parcela.conta_receber_id);
      if (conta.palestra_curso_id) {
        const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");
        
        // Tenta encontrar a parcela correspondente na palestra (geralmente por número ou ordem)
        // Como o Contas a Receber foi gerado a partir da palestra, podemos buscar por descrição ou ordem
        // Aqui vamos buscar a parcela da palestra que coincida com a data de vencimento e valor, ou número
        const numParcelaMatch = parcela.descricao.match(/Parcela (\d+)/);
        const numero = numParcelaMatch ? numParcelaMatch[1] : 1;

        const parcelaPalestra = await ParcelaPalestraCurso.query()
          .where("palestra_curso_id", conta.palestra_curso_id)
          .where("numero_parcela", numero)
          .first();

        if (parcelaPalestra) {
          parcelaPalestra.status_pagamento = 2; // Pago
          await parcelaPalestra.save(trx);

          // Atualizar status geral da palestra
          const MovimentacaoController = use("App/Controllers/Http/MovimentacaoController");
          const movCtrl = new MovimentacaoController();
          await movCtrl.atualizarStatusGeralPalestra(conta.palestra_curso_id, trx);
        }
      }
      // ------------------------------------

      await trx.commit();

      const parcelaAtualizada = await ContaReceberParcela.find(params.id);

      return response.json({
        success: true,
        message: "Parcela paga com sucesso",
        parcela: parcelaAtualizada,
      });
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao pagar parcela:", error);
      return response.status(500).send({
        error: "Erro ao processar pagamento",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  async updateParcela({ params, request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const parcela = await ContaReceberParcela.find(params.id);

      if (!parcela) {
        return response.status(404).send({ error: "Parcela não encontrada" });
      }

      const data = request.only([
        "data_vencimento",
        "status_pagamento",
        "data_pagamento",
        "forma_pagamento",
        "valor",
      ]);

      if (data.status_pagamento == 2 && !data.data_pagamento) {
        data.data_pagamento = new Date().toISOString();
      } else if (data.status_pagamento == 1) {
        data.data_pagamento = null;
      }

      parcela.merge(data);
      await parcela.save(trx);

      await this.atualizarStatusConta(parcela.conta_receber_id, trx);

      // --- SINCRONIZAÇÃO COM PALESTRAS ---
      const conta = await ContaReceber.find(parcela.conta_receber_id);
      if (conta.palestra_curso_id) {
        const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");
        
        const numParcelaMatch = parcela.descricao.match(/Parcela (\d+)/);
        const numero = numParcelaMatch ? numParcelaMatch[1] : 1;

        const parcelaPalestra = await ParcelaPalestraCurso.query()
          .where("palestra_curso_id", conta.palestra_curso_id)
          .where("numero_parcela", numero)
          .first();

        if (parcelaPalestra) {
          parcelaPalestra.status_pagamento = parcela.status_pagamento;
          await parcelaPalestra.save(trx);

          const MovimentacaoController = use("App/Controllers/Http/MovimentacaoController");
          const movCtrl = new MovimentacaoController();
          await movCtrl.atualizarStatusGeralPalestra(conta.palestra_curso_id, trx);
        }
      }
      // ------------------------------------

      await trx.commit();

      const parcelaAtualizada = await ContaReceberParcela.find(params.id);

      return response.send({
        success: true,
        message: "Parcela atualizada com sucesso",
        parcela: parcelaAtualizada,
      });
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao atualizar parcela:", error);
      return response.status(500).send({
        error: "Erro ao atualizar parcela",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }
  async atualizarStatusConta(contaId, trx = null) {
    const conta = await ContaReceber.find(contaId);
    if (!conta) return;

    const queryParcelas = ContaReceberParcela.query().where(
      "conta_receber_id",
      contaId,
    );
    if (trx) queryParcelas.transacting(trx);
    const parcelas = await queryParcelas.fetch();
    const parcelasArray = parcelas.rows || [];

    const hoje = DateTime.now().startOf("day");

    if (parcelasArray.length === 0) {
      conta.status = 1;
      await conta.save(trx);
      return;
    }

    const todasPagas = parcelasArray.every((p) => Number(p.status_pagamento) === 2);
    const algumaPaga = parcelasArray.some((p) => Number(p.status_pagamento) === 2);

    const algumaVencida = parcelasArray.some((p) => {
      if (Number(p.status_pagamento) === 2) return false;
      const dataVencimento = DateTime.fromISO(p.data_vencimento).startOf("day");
      return dataVencimento < hoje;
    });

    let novoStatus;
    if (todasPagas) {
      novoStatus = 2; // Pago
    } else if (algumaVencida) {
      novoStatus = 3; // Atrasado
    } else if (algumaPaga) {
      novoStatus = 4; // Em andamento
    } else {
      novoStatus = 1; // Pendente
    }

    if (conta.status !== novoStatus) {
      conta.status = novoStatus;
      await conta.save(trx);
    }
  }

  async destroy({ params, response }) {
    const trx = await Database.beginTransaction();

    try {
      const conta = await ContaReceber.find(params.id);

      if (!conta) {
        return response.status(404).send({ error: "Conta não encontrada" });
      }

      if (conta.orcamento_id) {
        return response.status(400).json({
          success: false,
          message:
            "Este registro está vinculado a um orçamento e não pode ser excluído diretamente. Por favor, gerencie a exclusão através do módulo de Orçamentos.",
        });
      }

      await ContaReceberParcela.query()
        .where("conta_receber_id", params.id)
        .delete(trx);

      await conta.delete(trx);

      await trx.commit();

      return response.status(200).send({
        success: true,
        message: "Conta e parcelas associadas foram excluídas com sucesso",
      });
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao excluir conta:", error);
      return response.status(500).send({
        error: "Erro ao excluir conta",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      });
    }
  }

  async getParcelasVencidas({ request, response }) {
    try {
      const { data_inicio, data_fim, prestador_id, categoria_id } =
        request.all();

      const hoje = DateTime.now().startOf("day");
      const hojeStr = hoje.toISODate();

      const query = Database.table("contas_receber_parcelas")
        .select(
          "contas_receber_parcelas.id",
          "contas_receber_parcelas.conta_receber_id",
          "contas_receber_parcelas.descricao",
          "contas_receber_parcelas.data_vencimento",
          "contas_receber_parcelas.valor",
          "contas_receber_parcelas.status_pagamento",
          "contas_receber.nome as conta_nome",
        )
        .leftJoin(
          "contas_receber",
          "contas_receber_parcelas.conta_receber_id",
          "contas_receber.id",
        )
        .where("contas_receber_parcelas.status_pagamento", 1)
        .where("contas_receber_parcelas.data_vencimento", "<", hojeStr);

      if (data_inicio) {
        query.where(
          "contas_receber_parcelas.data_vencimento",
          ">=",
          data_inicio,
        );
      }

      if (data_fim) {
        query.where("contas_receber_parcelas.data_vencimento", "<=", data_fim);
      }

      if (prestador_id) {
        query.where("contas_receber.prestador_id", prestador_id);
      }

      if (categoria_id) {
        query.where("contas_receber.categoria_id", categoria_id);
      }

      query.orderBy("contas_receber_parcelas.data_vencimento", "asc");

      const parcelasVencidas = await query;

      const parcelasFormatadas = parcelasVencidas.map((parcela) => {
        let dataVencimento = parcela.data_vencimento;

        if (!dataVencimento) {
          dataVencimento = new Date().toISOString().split("T")[0];
        }

        dataVencimento = String(dataVencimento);

        if (dataVencimento.includes("T")) {
          dataVencimento = dataVencimento.split("T")[0];
        }

        let dataFormatada = dataVencimento;
        try {
          const dataObj = DateTime.fromISO(dataVencimento);
          if (dataObj.isValid) {
            dataFormatada = dataObj.toFormat("dd/MM/yyyy");
          }
        } catch (e) {
          console.error("Erro ao formatar data:", e);
        }

        return {
          id: parcela.id,
          conta_id: parcela.conta_receber_id,
          nome: parcela.conta_nome || "Sem nome",
          descricao: parcela.descricao || "Sem descrição",
          data_vencimento: dataFormatada,
          valor: parseFloat(parcela.valor || 0).toFixed(2),
          status: "Pendente",
        };
      });

      return response.json({
        success: true,
        data: parcelasFormatadas,
      });
    } catch (error) {
      console.error("Erro ao buscar parcelas vencidas:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar parcelas vencidas",
        error: error.message,
      });
    }
  }

  getFormaPagamentoLabel(forma) {
    const formas = {
      1: "Crédito",
      2: "Débito",
      3: "Cheque",
      4: "Pix",
      5: "Dinheiro",
    };
    return formas[forma] || "Não informado";
  }

  async imprimir({ request, response }) {
    try {
      const filters = request.get();

      const query = ContaReceber.query()
        .with("parcelas", (builder) => {
          builder.select(
            "id",
            "conta_receber_id",
            "descricao",
            "data_vencimento",
            "data_pagamento",
            "valor",
            "status_pagamento",
          );
        })
        .with("categoria")
        .with("prestador")
        .select(
          "contas_receber.id",
          "contas_receber.nome",
          "contas_receber.categoria_id",
          "contas_receber.data_inicio",
          "contas_receber.data_fim",
          "contas_receber.valor_mensal",
          "contas_receber.valor_total",
          "contas_receber.status",
          "contas_receber.custo_fixo",
          "contas_receber.custo_variavel",
          "contas_receber.created_at",
        );

      if (filters.search || filters.nome) {
        const termo = filters.search || filters.nome;
        query.where("contas_receber.nome", "ILIKE", `%${termo}%`);
      }

      if (filters.status) {
        query.where("contas_receber.status", filters.status);
      }

      if (filters.categoria_id) {
        query.where("contas_receber.categoria_id", filters.categoria_id);
      }

      if (filters.custo_fixo !== undefined && filters.custo_fixo !== null && filters.custo_fixo !== "") {
        query.where("contas_receber.custo_fixo", filters.custo_fixo === "true" || filters.custo_fixo === true || filters.custo_fixo === "1");
      }

      if (filters.custo_variavel !== undefined && filters.custo_variavel !== null && filters.custo_variavel !== "") {
        query.where("contas_receber.custo_variavel", filters.custo_variavel === "true" || filters.custo_variavel === true || filters.custo_variavel === "1");
      }

      if (filters.data_inicio && filters.data_fim) {
        query.whereBetween("contas_receber.data_inicio", [
          filters.data_inicio,
          filters.data_fim,
        ]);
      } else if (filters.data_inicio) {
        query.where("contas_receber.data_inicio", ">=", filters.data_inicio);
      } else if (filters.data_fim) {
        query.where("contas_receber.data_inicio", "<=", filters.data_fim);
      }

      query.orderBy("contas_receber.data_inicio", "desc");

      const contas = await query.fetch();
      const contasJson = contas.toJSON();

      const totais = await this.calcularTotais(filters);

      const dadosImpressao = {
        data_geracao: new Date().toLocaleString("pt-BR"),
        filtros_aplicados: {
          pesquisa: filters.search || filters.nome || "Todos",
          status:
            filters.status === "1"
              ? "Pendente"
              : filters.status === "2"
                ? "Pago"
                : filters.status === "3"
                  ? "Atrasado"
                  : filters.status === "4"
                    ? "Em Andamento"
                    : "Todos",
          tipo: filters.custo_fixo === "true" ? "Custo Fixo" : filters.custo_variavel === "true" ? "Custo Variável" : "Todos",
          periodo:
            filters.data_inicio && filters.data_fim
              ? `${filters.data_inicio} até ${filters.data_fim}`
              : filters.data_inicio
                ? `A partir de ${filters.data_inicio}`
                : filters.data_fim
                  ? `Até ${filters.data_fim}`
                  : "Todo período",
        },
        totais: {
          total_geral: totais.total,
          total_pago: totais.pago,
          total_pendente: totais.pendente,
          quantidade_contas: contasJson.length,
        },
        contas: contasJson.map((conta) => ({
          id: conta.id,
          nome: conta.nome,
          tipo: conta.custo_fixo ? "Custo Fixo" : "Custo Variável",
          categoria: conta.categoria?.nome || "Não categorizado",
          data_inicio: conta.data_inicio,
          valor_mensal: conta.valor_mensal ? parseFloat(conta.valor_mensal) : null,
          valor_total: parseFloat(conta.valor_total || conta.valor_mensal || 0),
          status: this.getStatusLabel(conta.status),
          parcelas: (conta.parcelas || []).map((p) => ({
            descricao: p.descricao,
            data_vencimento: p.data_vencimento,
            valor: parseFloat(p.valor),
            status: p.status_pagamento === 2 ? "Pago" : "Pendente",
          })),
        })),
      };

      return response.json(dadosImpressao);
    } catch (error) {
      console.error("Erro ao gerar dados para impressão:", error);
      return response.status(500).json({
        error: "Erro ao gerar dados para impressão",
        details: error.message,
      });
    }
  }

  getStatusLabel(status) {
    switch (parseInt(status)) {
      case 1:
        return "Pendente";
      case 2:
        return "Pago";
      case 3:
        return "Atrasado";
      case 4:
        return "Em Andamento";
      default:
        return "Desconhecido";
    }
  }

  async calcularTotais(filtros) {
    const query = Database.from("contas_receber")
      .leftJoin(
        "contas_receber_parcelas",
        "contas_receber.id",
        "contas_receber_parcelas.conta_receber_id",
      )
      .select(
        Database.raw(`
        COALESCE(
          SUM(CASE 
            WHEN contas_receber_parcelas.id IS NOT NULL 
              AND contas_receber_parcelas.status_pagamento = 1 
            THEN contas_receber_parcelas.valor 
            ELSE 0 
          END), 0
        ) as pendente,
        
        COALESCE(
          SUM(CASE 
            WHEN contas_receber_parcelas.id IS NOT NULL 
              AND contas_receber_parcelas.status_pagamento = 2 
            THEN contas_receber_parcelas.valor 
            ELSE 0 
          END), 0
        ) as pago,
        
        COALESCE(
          SUM(CASE 
            WHEN contas_receber_parcelas.id IS NOT NULL 
            THEN contas_receber_parcelas.valor
            ELSE COALESCE(contas_receber.valor_total, contas_receber.valor_mensal, 0)
          END), 0
        ) as total
      `),
      );

    if (filtros.data_inicio) {
      query.where("contas_receber.data_inicio", ">=", filtros.data_inicio);
    }

    if (filtros.data_fim) {
      query.where("contas_receber.data_inicio", "<=", filtros.data_fim);
    }

    if (filtros.custo_fixo !== undefined && filtros.custo_fixo !== null && filtros.custo_fixo !== "") {
      const isFixo = filtros.custo_fixo === "true" || filtros.custo_fixo === true || filtros.custo_fixo === "1";
      if (isFixo) {
        query.where("contas_receber.custo_fixo", true);
      } else {
        query.where((builder) => {
          builder.where("contas_receber.custo_fixo", false).orWhereNull("contas_receber.custo_fixo");
        });
      }
    }

    if (filtros.custo_variavel !== undefined && filtros.custo_variavel !== null && filtros.custo_variavel !== "") {
      const isVariavel = filtros.custo_variavel === "true" || filtros.custo_variavel === true || filtros.custo_variavel === "1";
      if (isVariavel) {
        query.where("contas_receber.custo_variavel", true);
      } else {
        query.where((builder) => {
          builder.where("contas_receber.custo_variavel", false).orWhereNull("contas_receber.custo_variavel");
        });
      }
    }

    if (filtros.status) {
      const statusNum = parseInt(filtros.status);
      if ([1, 2, 3, 4].includes(statusNum)) {
        query.where("contas_receber.status", statusNum);
      }
    }

    const result = await query.first();

    return {
      pendente: parseFloat(result?.pendente || 0).toFixed(2),
      pago: parseFloat(result?.pago || 0).toFixed(2),
      total: parseFloat(result?.total || 0).toFixed(2),
    };
  }
}

module.exports = ContaReceberController;
