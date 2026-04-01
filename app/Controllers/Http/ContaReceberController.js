const ContaReceber = use("App/Models/ContaReceber");
const ContaReceberParcela = use("App/Models/ContaReceberParcela");
const { DateTime } = require("luxon");
const Database = use("Database");

class ContaReceberController {
  async getTotais({ request, response }) {
    try {
      const { data_inicio, data_fim, status } = request.all();

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

      if (data_inicio) {
        query.where("contas_receber.data_inicio", ">=", data_inicio);
      }

      if (data_fim) {
        query.where("contas_receber.data_inicio", "<=", data_fim);
      }

      if (status) {
        const statusNum = parseInt(status);
        if (
          statusNum === 1 ||
          statusNum === 2 ||
          statusNum === 3 ||
          statusNum === 4
        ) {
          query.where("contas_receber.status", statusNum);
        }
      }

      const result = await query.first();

      if (!result) {
        return response.json({
          success: true,
          data: {
            pendente: "0.00",
            pago: "0.00",
            total: "0.00",
          },
        });
      }

      const totais = {
        pendente: parseFloat(result.pendente || 0).toFixed(2),
        pago: parseFloat(result.pago || 0).toFixed(2),
        total: parseFloat(result.total || 0).toFixed(2),
      };

      return response.json({
        success: true,
        data: totais,
      });
    } catch (error) {
      console.error("ERRO CRÍTICO ao buscar totais:", error);
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);

      return response.status(500).send({
        error: "Erro ao buscar totais",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : null,
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
      } = request.all();

      const query = ContaReceber.query().select([
        "id",
        "nome",
        "data_inicio as data",
        Database.raw("COALESCE(valor_total, valor_mensal) as valor"),
        "status as status_pagamento",
      ]);

      if (status) {
        query.where("status", status);
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

      const allowedSortFields = ["nome", "data_inicio", "valor", "status"];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "data_inicio";

      if (safeSortBy === "valor") {
        query.orderByRaw("COALESCE(valor_total, valor_mensal) " + sortOrder);
      } else {
        query.orderBy(safeSortBy, sortOrder);
      }

      const contas = await query.paginate(page, perPage);

      const formattedData = contas.toJSON();

      formattedData.data = formattedData.data.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        data: conta.data,
        valor: parseFloat(conta.valor) || 0,
        status_pagamento: conta.status_pagamento || 1,
        status_label: this.getStatusLabel(conta.status_pagamento || 1),
      }));

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

      const responseData = {
        ...contaJSON,
        parcelas: parcelasProcessadas,
        status_consolidado: {
          codigo: contaJSON.status,
          label: this.getStatusLabel(contaJSON.status),
        },
        resumo_parcelas: resumoParcelas,
        pode_ser_paga: contaJSON.status !== 2,
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

    const parcelas = await ContaReceberParcela.query()
      .where("conta_receber_id", contaId)
      .fetch();

    const parcelasArray = parcelas.toJSON();
    const hoje = DateTime.now().startOf("day");

    if (parcelasArray.length === 0) {
      if (conta.status !== 1) {
        conta.status = 1;
        await conta.save(trx);
      }
      return;
    }

    const todasPagas = parcelasArray.every((p) => p.status_pagamento == 2);
    const algumaPaga = parcelasArray.some((p) => p.status_pagamento == 2);

    const algumaVencida = parcelasArray.some((p) => {
      if (p.status_pagamento == 2) return false;
      const dataVencimento = DateTime.fromISO(p.data_vencimento).startOf("day");
      return dataVencimento < hoje;
    });

    let novoStatus;
    if (todasPagas) {
      novoStatus = 2;
    } else if (algumaVencida) {
      novoStatus = 3;
    } else if (algumaPaga) {
      novoStatus = 4;
    } else {
      novoStatus = 1;
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
}

module.exports = ContaReceberController;
