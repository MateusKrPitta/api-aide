const ContaReceber = use("App/Models/ContaReceber");
const ContaReceberParcela = use("App/Models/ContaReceberParcela");
const { DateTime } = require("luxon");
const Database = use("Database");

class ContaReceberController {
  async store({ request, response, auth }) {
    try {
      // Verifica autenticação primeiro
      await auth.check();

      const rawData = request.all();
      console.log("Dados brutos recebidos:", rawData);

      // Corrige possíveis typos nos campos
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

      console.log("Dados processados:", data);

      // Validações básicas
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

      // Validações específicas para cada tipo
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

      // Cria a conta principal
      const conta = await ContaReceber.create(data);

      // Prepara parcelas
      const parcelas = [];
      const inicio = DateTime.fromISO(data.data_inicio);

      if (data.custo_fixo) {
        const quantidadeParcelas = parseInt(data.quantidade_parcelas);
        const fim = inicio.plus({ months: quantidadeParcelas - 1 });

        // Atualiza a conta com a data_fim calculada
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
            status_pagamento: 2,
          });
        }
      } else {
        parcelas.push({
          conta_receber_id: conta.id,
          descricao: "Parcela única",
          data_vencimento: inicio.toISODate(),
          valor: parseFloat(data.valor_total),
          status: 1,
          status_pagamento: 2,
          forma_pagamento: data.forma_pagamento,
        });
      }

      // Cria as parcelas
      await ContaReceberParcela.createMany(parcelas);

      // Carrega relacionamentos
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

  async index() {
    return await ContaReceber.query().with("parcelas").fetch();
  }

  async show({ params, response }) {
    const conta = await ContaReceber.query()
      .where("id", params.id)
      .with("parcelas")
      .first();

    if (!conta) {
      return response.status(404).send({ error: "Conta não encontrada" });
    }

    return conta;
  }

  async pagarParcela({ params, request, response }) {
    const parcela = await ContaReceberParcela.find(params.id);

    if (!parcela) {
      return response.status(404).send({ error: "Parcela não encontrada" });
    }

    parcela.status = 2;
    parcela.status_pagamento = 2;
    parcela.data_pagamento = new Date();
    parcela.forma_pagamento =
      request.input("forma_pagamento") || parcela.forma_pagamento;

    await parcela.save();

    return parcela;
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

    // Atualiza status_geral com base no status_pagamento
    if (data.status_pagamento) {
      data.status_geral = data.status_pagamento;
    }

    conta.merge(data);
    await conta.save();

    // Para contas variáveis, atualiza a única parcela
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
        "valor", // Adicione se quiser permitir edição do valor
      ]);

      // Lógica para data de pagamento
      if (data.status_pagamento == 1 && !data.data_pagamento) {
        data.data_pagamento = new Date().toISOString();
      } else if (data.status_pagamento == 2) {
        data.data_pagamento = null;
      }

      // Atualiza a parcela
      parcela.merge(data);
      await parcela.save(trx);

      // Atualiza o status da conta principal se necessário
      await this.atualizarStatusConta(parcela.conta_receber_id, trx);

      await trx.commit();

      return response.send({
        success: true,
        parcela: await ContaReceberParcela.query()
          .where("id", params.id)
          .first(),
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
  async atualizarStatusConta(contaId, trx) {
    const conta = await ContaReceber.find(contaId);
    if (!conta) return;

    const parcelas = await ContaReceberParcela.query()
      .where("conta_receber_id", contaId)
      .fetch();

    const parcelasArray = parcelas.toJSON();

    // Verifica status das parcelas (usando status_pagamento que já existe)
    const todasPagas = parcelasArray.every((p) => p.status_pagamento == 2);
    const algumaPaga = parcelasArray.some((p) => p.status_pagamento == 2);

    // Define novo status da conta principal
    let novoStatus;
    if (todasPagas) {
      novoStatus = 2; // Pago
    } else if (algumaPaga) {
      novoStatus = 3; // Parcial
    } else {
      novoStatus = 1; // Pendente
    }

    // Atualiza somente se mudou
    if (conta.status !== novoStatus) {
      conta.status = novoStatus;
      await conta.save(trx);
    }
  }
  async destroy({ params, response }) {
    const trx = await Database.beginTransaction();

    try {
      // Encontra a conta
      const conta = await ContaReceber.find(params.id);

      if (!conta) {
        return response.status(404).send({ error: "Conta não encontrada" });
      }

      // Primeiro deleta todas as parcelas associadas
      await ContaReceberParcela.query()
        .where("conta_receber_id", params.id)
        .delete(trx);

      // Depois deleta a conta principal
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
}

module.exports = ContaReceberController;
