"use strict";

const ContaPagar = use("App/Models/ContaPagar");
const ContaPagarParcela = use("App/Models/ContaPagarParcela");
const Database = use("Database");

class ContaPagarController {
  // Lista todas as contas COM PAGINAÇÃO
  async index({ request }) {
    const { page = 1, perPage = 10, ...filters } = request.get();

    const query = ContaPagar.query().with("parcelas");

    // Aplicar filtros se existirem
    if (filters.search) {
      query.where("nome", "LIKE", `%${filters.search}%`);
    }

    if (filters.status_geral) {
      query.where("status_geral", filters.status_geral);
    }

    if (filters.categoria_id) {
      query.where("categoria_id", filters.categoria_id);
    }

    if (filters.prestador_id) {
      query.where("prestador_id", filters.prestador_id);
    }

    if (filters.data_inicio && filters.data_fim) {
      query.whereBetween("data_inicio", [
        filters.data_inicio,
        filters.data_fim,
      ]);
    } else if (filters.data_inicio) {
      query.where("data_inicio", ">=", filters.data_inicio);
    } else if (filters.data_fim) {
      query.where("data_inicio", "<=", filters.data_fim);
    }

    // Ordenar por data de criação (mais recentes primeiro)
    query.orderBy("created_at", "desc");

    const contas = await query.paginate(page, perPage);

    return contas;
  }

  async store({ request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const data = request.only([
        "nome",
        "custo_fixo",
        "custo_variavel",
        "prestador_id",
        "data_inicio",
        "data_fim",
        "valor_mensal",
        "valor_total",
        "categoria_id",
      ]);

      // Validações básicas
      if (data.custo_fixo) {
        if (!data.data_fim) {
          return response.status(400).json({
            error: "Data fim é obrigatória para custos fixos",
          });
        }
        if (!data.valor_mensal) {
          return response.status(400).json({
            error: "Valor mensal é obrigatório para custos fixos",
          });
        }
        // Calcula o valor total automaticamente para custos fixos
        const meses = this.calcularMeses(data.data_inicio, data.data_fim);
        data.valor_total = meses * data.valor_mensal;
      } else {
        if (!data.valor_total) {
          return response.status(400).json({
            error: "Valor total é obrigatório para custos variáveis",
          });
        }
        // Para custo variável, o valor_mensal será calculado nas parcelas
        data.valor_mensal = null;
      }

      const conta = await ContaPagar.create(data, trx);
      await this.gerarParcelas(conta, trx);

      await trx.commit();
      return conta;
    } catch (error) {
      await trx.rollback();
      console.error(error);
      return response.status(500).json({
        error: "Erro ao cadastrar conta",
        details: error.message,
      });
    }
  }

  calcularMeses(dataInicio, dataFim) {
    const start = new Date(dataInicio);
    const end = new Date(dataFim);
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1
    );
  }

  // Método para gerar parcelas (custo fixo)
  async gerarParcelas(conta, trx) {
    const { data_inicio, data_fim, valor_mensal, valor_total, custo_fixo } =
      conta;

    // Calcula o número correto de meses entre as datas
    const startDate = new Date(data_inicio);
    const endDate = new Date(data_fim);

    // Calcula a diferença em meses
    let meses = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    meses += endDate.getMonth() - startDate.getMonth();
    meses += 1; // Adiciona 1 para incluir ambos os meses inicial e final

    // Para custo fixo, usa valor_mensal, para variável divide o total
    const valorParcela = custo_fixo ? valor_mensal : valor_total / meses;

    for (let i = 0; i < meses; i++) {
      const dataVencimento = new Date(startDate);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      await ContaPagarParcela.create(
        {
          conta_pagar_id: conta.id,
          descricao: `Parcela ${i + 1}/${meses}`,
          data_vencimento: dataVencimento,
          valor: valorParcela,
          status: 1, // Pendente
        },
        trx,
      );
    }
  }

  // Atualiza o status de uma parcela
  async updateParcela({ params, request }) {
    const { id } = params;
    const { status, forma_pagamento, data_pagamento } = request.only([
      "status",
      "forma_pagamento",
      "data_pagamento",
    ]);

    const parcela = await ContaPagarParcela.findOrFail(id);
    parcela.merge({ status, forma_pagamento, data_pagamento });
    await parcela.save();

    // Atualiza o status geral da conta (se todas as parcelas foram pagas)
    await this.atualizarStatusConta(parcela.conta_pagar_id);

    return parcela;
  }

  // Verifica e atualiza o status da conta principal
  async atualizarStatusConta(contaId) {
    const conta = await ContaPagar.findOrFail(contaId);
    const parcelas = await conta.parcelas().fetch();

    const todasPagas = parcelas.rows.every((p) => p.status === 3);
    const algumaEmAndamento = parcelas.rows.some((p) => p.status === 2);

    if (todasPagas) {
      conta.status_geral = 3; // Pago
    } else if (algumaEmAndamento) {
      conta.status_geral = 2; // Em andamento
    } else {
      conta.status_geral = 1; // Pendente
    }

    await conta.save();
  }

  async update({ params, request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const { id } = params;
      const data = request.only([
        "nome",
        "custo_fixo",
        "custo_variavel",
        "prestador_id",
        "data_inicio",
        "data_fim",
        "valor_mensal",
        "valor_total",
        "status_geral",
        "categoria_id",
      ]);

      const conta = await ContaPagar.findOrFail(id);
      const eraCustoFixo = conta.custo_fixo;
      // Validações básicas
      if (data.custo_fixo) {
        if (!data.data_fim) {
          await trx.rollback();
          return response.status(400).json({
            error: "Data fim é obrigatória para custos fixos",
          });
        }
        if (!data.valor_mensal) {
          await trx.rollback();
          return response.status(400).json({
            error: "Valor mensal é obrigatório para custos fixos",
          });
        }
        // Recalcula o valor total
        const meses = this.calcularMeses(data.data_inicio, data.data_fim);
        data.valor_total = meses * data.valor_mensal;
      } else {
        if (!data.valor_total) {
          await trx.rollback();
          return response.status(400).json({
            error: "Valor total é obrigatório para custos variáveis",
          });
        }
      }

      if (eraCustoFixo && !data.custo_fixo) {
        await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);
        // Zera o valor_mensal pois não se aplica mais
        data.valor_mensal = null;
      }

      if (!eraCustoFixo && data.custo_fixo) {
        // Remove parcelas existentes (se houver)
        await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);
        // Gera novas parcelas
        await this.gerarParcelas(conta, trx);
      }

      // Armazena os valores originais antes da atualização
      const originalData = {
        data_inicio: conta.data_inicio,
        data_fim: conta.data_fim,
        valor_mensal: conta.valor_mensal,
        custo_fixo: conta.custo_fixo,
      };

      // Atualiza os dados básicos
      conta.merge(data);
      await conta.save(trx);

      // Se for custo fixo e alterou datas/valor, recalcula parcelas
      if (
        data.custo_fixo &&
        (data.data_inicio !== originalData.data_inicio ||
          data.data_fim !== originalData.data_fim ||
          data.valor_mensal !== originalData.valor_mensal)
      ) {
        // Remove parcelas existentes
        await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);

        // Gera novas parcelas
        await this.gerarParcelas(conta, trx);
      }

      await trx.commit();
      return conta;
    } catch (error) {
      await trx.rollback();
      console.error(error);
      return response.status(500).json({
        error: "Erro ao atualizar conta",
        details: error.message,
      });
    }
  }

  async destroy({ params, response }) {
    const trx = await Database.beginTransaction();

    try {
      const { id } = params;

      // Primeiro deleta todas as parcelas
      await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);

      // Depois deleta a conta principal
      const conta = await ContaPagar.findOrFail(id);
      await conta.delete(trx);

      await trx.commit();

      return response.status(204).send();
    } catch (error) {
      await trx.rollback();
      console.error(error);
      return response.status(500).json({
        error: "Erro ao deletar conta",
        details: error.message,
      });
    }
  }

  async updateParcelaIndividual({ params, request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const { id } = params;
      const data = request.only([
        "descricao",
        "data_vencimento",
        "data_pagamento",
        "valor",
        "status",
        "forma_pagamento",
      ]);

      // Validações
      if (data.status == 2 && !data.data_pagamento) {
        await trx.rollback();
        return response.status(400).json({
          error: "Data de pagamento é obrigatória para status 'Pago'",
        });
      }

      const parcela = await ContaPagarParcela.findOrFail(id);

      // Converte tipos
      const dadosAtualizados = {
        ...data,
        valor: data.valor ? parseFloat(data.valor) : parcela.valor,
        status: data.status ? parseInt(data.status) : parcela.status,
      };

      parcela.merge(dadosAtualizados);
      await parcela.save(trx);

      await this.atualizarStatusConta(parcela.conta_pagar_id);

      await trx.commit();

      return parcela;
    } catch (error) {
      await trx.rollback();
      console.error(error);
      return response.status(500).json({
        error: "Erro ao atualizar parcela",
        details: error.message,
      });
    }
  }

  async recalcularValorTotal(contaId, trx) {
    const parcelas = await ContaPagarParcela.query()
      .where("conta_pagar_id", contaId)
      .transacting(trx)
      .fetch();

    const valorTotal = parcelas.rows.reduce(
      (sum, parcela) => sum + parseFloat(parcela.valor),
      0,
    );

    await ContaPagar.query()
      .where("id", contaId)
      .transacting(trx)
      .update({ valor_total: valorTotal });
  }

  // Método adicional para buscar TODAS as contas sem paginação (se necessário)
  async all({ request }) {
    return await ContaPagar.query().with("parcelas").fetch();
  }
}

module.exports = ContaPagarController;
