"use strict";

const ContaPagar = use("App/Models/ContaPagar");
const ContaPagarParcela = use("App/Models/ContaPagarParcela");
const Database = use("Database");

class ContaPagarController {
  async index({ request }) {
    const { page = 1, perPage = 10, ...filters } = request.get();

    const query = ContaPagar.query()
      .with("parcelas", (builder) => {
        builder.select("id", "conta_pagar_id", "status", "data_vencimento");
      })
      .select(
        "contas_pagar.id",
        "contas_pagar.nome",
        "contas_pagar.categoria_id",
        "contas_pagar.data_inicio",
        "contas_pagar.valor_total",
        "contas_pagar.status_geral",
        "contas_pagar.custo_fixo",
        "contas_pagar.custo_variavel",
        "contas_pagar.created_at",
        "categorias.nome as categoria_nome",
      )
      .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id");

    if (filters.search) {
      query.where("contas_pagar.nome", "LIKE", `%${filters.search}%`);
    }

    if (filters.status_pagamento) {
      const statusMap = {
        Pendente: 1,
        Pago: 2,
        "Em andamento": 3,
      };

      const statusValue = statusMap[filters.status_pagamento];

      if (statusValue) {
        query.whereRaw(
          `
        (
          -- Para custos variáveis
          (contas_pagar.custo_variavel = true AND contas_pagar.status_geral = ?)
          OR
          -- Para custos fixos com base nas parcelas
          (
            contas_pagar.custo_fixo = true AND
            EXISTS (
              SELECT 1 FROM contas_pagar_parcelas cpp
              WHERE cpp.conta_pagar_id = contas_pagar.id
              HAVING
                ${
                  statusValue === 2
                    ? "COUNT(CASE WHEN cpp.status = 2 THEN 1 END) = COUNT(*)"
                    : statusValue === 3
                      ? "COUNT(CASE WHEN cpp.status IN (2,3) THEN 1 END) > 0 AND COUNT(CASE WHEN cpp.status = 2 THEN 1 END) < COUNT(*)"
                      : "COUNT(CASE WHEN cpp.status = 1 THEN 1 END) = COUNT(*)"
                }
            )
          )
        )
      `,
          statusValue,
        );
      }
    } else if (filters.status_geral) {
      query.where("contas_pagar.status_geral", filters.status_geral);
    }

    if (filters.categoria_id) {
      query.where("contas_pagar.categoria_id", filters.categoria_id);
    }

    if (filters.prestador_id) {
      query.where("contas_pagar.prestador_id", filters.prestador_id);
    }

    if (filters.data_inicio && filters.data_fim) {
      query.whereBetween("contas_pagar.data_inicio", [
        filters.data_inicio,
        filters.data_fim,
      ]);
    } else if (filters.data_inicio) {
      query.where("contas_pagar.data_inicio", ">=", filters.data_inicio);
    } else if (filters.data_fim) {
      query.where("contas_pagar.data_inicio", "<=", filters.data_fim);
    }

    query.orderBy("contas_pagar.created_at", "desc");

    const contas = await query.paginate(page, perPage);

    const contasFormatadas = contas.toJSON();
    contasFormatadas.data = contasFormatadas.data.map((conta) => {
      const parcelas = conta.parcelas || [];

      if (parcelas.length === 0) {
        let statusPagamento;
        if (conta.status_geral === 2) {
          statusPagamento = "Pago";
        } else if (conta.status_geral === 3) {
          statusPagamento = "Em andamento";
        } else {
          statusPagamento = "Pendente";
        }

        return {
          id: conta.id,
          nome: conta.nome,
          data: conta.data_inicio,
          categoria_id: conta.categoria_id,
          categoria: conta.categoria_nome || "Não categorizado",
          valor: conta.valor_total,
          status_pagamento: statusPagamento,
        };
      }

      const todasPagas = parcelas.every((p) => p.status === 2);
      const temPagas = parcelas.some((p) => p.status === 2);
      const temPendentes = parcelas.some((p) => p.status === 1);
      const temEmAndamento = parcelas.some((p) => p.status === 3);

      let statusPagamento;

      if (todasPagas) {
        statusPagamento = "Pago";
      } else if (temEmAndamento) {
        statusPagamento = "Em andamento";
      } else if (temPagas && temPendentes) {
        statusPagamento = "Em andamento";
      } else if (temPagas && !temPendentes) {
        statusPagamento = "Em andamento";
      } else {
        statusPagamento = "Pendente";
      }

      return {
        id: conta.id,
        nome: conta.nome,
        data: conta.data_inicio,
        categoria_id: conta.categoria_id,
        categoria: conta.categoria_nome || "Não categorizado",
        valor: conta.valor_total,
        status_pagamento: statusPagamento,
      };
    });

    return contasFormatadas;
  }

  async show({ params, response }) {
    try {
      const { id } = params;

      const conta = await ContaPagar.query()
        .with("parcelas", (builder) => {
          builder
            .select(
              "id",
              "conta_pagar_id",
              "descricao",
              "data_vencimento",
              "data_pagamento",
              "valor",
              "status",
              "forma_pagamento",
              "created_at",
            )
            .orderBy("data_vencimento", "asc");
        })
        .with("categoria")
        .with("prestador")
        .where("id", id)
        .first();

      if (!conta) {
        return response.status(404).json({
          error: "Conta não encontrada",
        });
      }

      const contaJson = conta.toJSON();
      const parcelas = contaJson.parcelas || [];

      contaJson.categoria_nome =
        contaJson.categoria?.nome || "Não categorizado";
      contaJson.prestador_nome = contaJson.prestador?.nome || null;

      const parcelasFormatadas = parcelas.map((parcela) => ({
        id: parcela.id,
        descricao: parcela.descricao,
        data_vencimento: parcela.data_vencimento,
        data_pagamento: parcela.data_pagamento,
        valor: parseFloat(parcela.valor),
        status: parcela.status,
        status_texto:
          parcela.status === 2
            ? "Pago"
            : parcela.status === 3
              ? "Em andamento"
              : "Pendente",
        forma_pagamento: parcela.forma_pagamento,
      }));

      const todasPagas = parcelas.every((p) => p.status === 2);
      const temPagas = parcelas.some((p) => p.status === 2);
      const temPendentes = parcelas.some((p) => p.status === 1);
      const temEmAndamento = parcelas.some((p) => p.status === 3);

      let statusPagamento;

      if (todasPagas) {
        statusPagamento = "Pago";
      } else if (temEmAndamento) {
        statusPagamento = "Em andamento";
      } else if (temPagas && temPendentes) {
        statusPagamento = "Em andamento";
      } else if (temPagas && !temPendentes) {
        statusPagamento = "Em andamento";
      } else {
        statusPagamento = "Pendente";
      }

      const contaFormatada = {
        id: contaJson.id,
        nome: contaJson.nome,
        tipo: contaJson.custo_fixo ? "Custo Fixo" : "Custo Variável",
        custo_fixo: contaJson.custo_fixo,
        custo_variavel: contaJson.custo_variavel,
        prestador_id: contaJson.prestador_id,
        prestador_nome: contaJson.prestador_nome,
        data_inicio: contaJson.data_inicio,
        data_fim: contaJson.data_fim,
        valor_mensal: contaJson.valor_mensal
          ? parseFloat(contaJson.valor_mensal)
          : null,
        valor_total: parseFloat(contaJson.valor_total),
        categoria_id: contaJson.categoria_id,
        categoria_nome: contaJson.categoria_nome,
        status_geral: contaJson.status_geral,
        status_pagamento: statusPagamento,
        data_pagamento: contaJson.data_pagamento,
        created_at: contaJson.created_at,
        updated_at: contaJson.updated_at,
        parcelas: parcelasFormatadas,
        total_parcelas: parcelasFormatadas.length,
        parcelas_pagas: parcelasFormatadas.filter((p) => p.status === 2).length,
        parcelas_pendentes: parcelasFormatadas.filter((p) => p.status === 1)
          .length,
        parcelas_andamento: parcelasFormatadas.filter((p) => p.status === 3)
          .length,
        valor_pago: parcelasFormatadas
          .filter((p) => p.status === 2)
          .reduce((acc, p) => acc + p.valor, 0),
        valor_pendente: parcelasFormatadas
          .filter((p) => p.status !== 2)
          .reduce((acc, p) => acc + p.valor, 0),
      };

      return contaFormatada;
    } catch (error) {
      console.error("Erro ao buscar conta:", error);
      return response.status(500).json({
        error: "Erro ao buscar conta",
        details: error.message,
      });
    }
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
        "status_geral",
        "data_pagamento",
      ]);

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

        const meses = this.calcularMeses(data.data_inicio, data.data_fim);
        data.valor_total = meses * data.valor_mensal;

        data.data_pagamento = null;
        data.status_geral = 1;
      } else {
        if (!data.valor_total) {
          await trx.rollback();
          return response.status(400).json({
            error: "Valor total é obrigatório para custos variáveis",
          });
        }

        data.valor_mensal = null;
        data.data_fim = null;

        if (data.status_geral === 2 && !data.data_pagamento) {
          await trx.rollback();
          return response.status(400).json({
            error: "Data de pagamento é obrigatória para status 'Pago'",
          });
        }

        if (data.status_geral !== 2) {
          data.data_pagamento = null;
        }

        if (!data.status_geral) {
          data.status_geral = 1; 
        }
      }

      const conta = await ContaPagar.create(data, trx);

      if (conta.custo_fixo) {
        await this.gerarParcelas(conta, trx);
      }

      await trx.commit();

      return this.show({ params: { id: conta.id }, response });
    } catch (error) {
      await trx.rollback();
      console.error("❌ Erro ao cadastrar conta:", error);
      return response.status(500).json({
        error: "Erro ao cadastrar conta",
        details: error.message,
        stack: error.stack,
      });
    }
  }

  calcularMeses(dataInicio, dataFim) {
    const start = new Date(dataInicio.split("T")[0]);
    const end = new Date(dataFim.split("T")[0]);

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    return (
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth()) +
      1
    );
  }

  async gerarParcelas(conta, trx) {
    const {
      id,
      data_inicio,
      data_fim,
      valor_mensal,
      status_geral,
      data_pagamento,
    } = conta;

    const startDate = new Date(data_inicio.split("T")[0]);
    const endDate = new Date(data_fim.split("T")[0]);

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    let meses = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12;
    meses += endDate.getUTCMonth() - startDate.getUTCMonth();
    meses += 1;

    if (meses <= 0) {
      console.error(`❌ Erro: Número de meses inválido: ${meses}`);
      return;
    }

    const valorParcela = parseFloat(valor_mensal);
    const contaPaga = status_geral === 2;

    const diaVencimento = startDate.getUTCDate();

    for (let i = 0; i < meses; i++) {
      const dataVencimento = new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth() + i,
          diaVencimento,
        ),
      );

      const dataVencimentoStr = dataVencimento.toISOString().split("T")[0];

      let status = 1; 
      let dataPagamentoParcela = null;

      if (contaPaga) {
        status = 2; 
        dataPagamentoParcela =
          data_pagamento || new Date().toISOString().split("T")[0];
      }

      await ContaPagarParcela.create(
        {
          conta_pagar_id: conta.id,
          descricao: `Parcela ${i + 1}/${meses}`,
          data_vencimento: dataVencimentoStr,
          valor: valorParcela,
          status: status,
          data_pagamento: dataPagamentoParcela,
        },
        trx,
      );
    }
  }

  async updateParcela({ params, request, response }) {
    try {
      const { id } = params;
      const { status, forma_pagamento, data_pagamento } = request.only([
        "status",
        "forma_pagamento",
        "data_pagamento",
      ]);

      const parcela = await ContaPagarParcela.findOrFail(id);
      parcela.merge({ status, forma_pagamento, data_pagamento });
      await parcela.save();

      await this.atualizarStatusConta(parcela.conta_pagar_id);

      return parcela;
    } catch (error) {
      console.error("Erro ao atualizar parcela:", error);
      return response.status(500).json({
        error: "Erro ao atualizar parcela",
        details: error.message,
      });
    }
  }

  async atualizarStatusConta(contaId) {
    const conta = await ContaPagar.findOrFail(contaId);
    const parcelas = await conta.parcelas().fetch();

    const todasPagas = parcelas.rows.every((p) => p.status === 2);
    const algumaEmAndamento = parcelas.rows.some((p) => p.status === 3);
    const algumaPaga = parcelas.rows.some((p) => p.status === 2);

    if (todasPagas) {
      conta.status_geral = 2;
    } else if (algumaEmAndamento || algumaPaga) {
      conta.status_geral = 3; 
    } else {
      conta.status_geral = 1;
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
        "data_pagamento",
      ]);

      const conta = await ContaPagar.findOrFail(id);
      const eraCustoFixo = conta.custo_fixo;

      conta.merge(data);
      await conta.save(trx);

      if (conta.custo_fixo) {
        await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);
        await this.gerarParcelas(conta, trx);

        if (data.status_geral === 2) {
          await ContaPagarParcela.query()
            .where("conta_pagar_id", id)
            .transacting(trx)
            .update({
              status: 2,
              data_pagamento:
                data.data_pagamento || new Date().toISOString().split("T")[0],
            });
        }
      } else if (!conta.custo_fixo && eraCustoFixo) {
        await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);
      }

      await trx.commit();

      return this.show({ params: { id }, response });
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao atualizar conta:", error);
      return response.status(500).json({
        error: "Erro ao atualizar conta",
        details: error.message,
      });
    }
  }

  async listarParcelasPendentes({ request, response }) {
    try {
      const { data_inicio, data_fim } = request.get();

      const query = ContaPagarParcela.query()
        .with("conta", (builder) => {
          builder
            .select("id", "nome", "categoria_id")
            .with("categoria", (catBuilder) => {
              catBuilder.select("id", "nome");
            });
        })
        .select(
          "id",
          "conta_pagar_id",
          "descricao",
          "data_vencimento",
          "valor",
          "status",
        )
        .where("status", 1)  
        .orderBy("data_vencimento", "asc");

      if (data_inicio) {
        query.where("data_vencimento", ">=", data_inicio);
      }

      if (data_fim) {
        query.where("data_vencimento", "<=", data_fim);
      }

      const parcelas = await query.fetch();

      const parcelasFormatadas = parcelas.toJSON().map((parcela) => ({
        id: parcela.id,
        conta_id: parcela.conta_pagar_id,
        nome_conta: parcela.conta?.nome || "Conta não encontrada",
        categoria: parcela.conta?.categoria?.nome || "Não categorizado",
        descricao_parcela: parcela.descricao,
        data_vencimento: parcela.data_vencimento,
        valor: parseFloat(parcela.valor),
        status: "Pendente",
        dias_para_vencimento: this.calcularDiasParaVencimento(
          parcela.data_vencimento,
        ),
      }));

      return response.json({
        total: parcelasFormatadas.length,
        parcelas: parcelasFormatadas,
      });
    } catch (error) {
      console.error("Erro ao buscar parcelas pendentes:", error);
      return response.status(500).json({
        error: "Erro ao buscar parcelas pendentes",
        details: error.message,
      });
    }
  }

  calcularDiasParaVencimento(dataVencimento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);

    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  async destroy({ params, response }) {
    const trx = await Database.beginTransaction();

    try {
      const { id } = params;

      await ContaPagarParcela.query().where("conta_pagar_id", id).delete(trx);
      const conta = await ContaPagar.findOrFail(id);
      await conta.delete(trx);

      await trx.commit();

      return response.status(204).send();
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao deletar conta:", error);
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

      const parcela = await ContaPagarParcela.findOrFail(id);

      if (data.data_pagamento && !data.status) {
        data.status = 2;
      }

      if (data.status == 2 && !data.data_pagamento) {
        data.data_pagamento = new Date().toISOString().split("T")[0];
      }

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
      console.error("Erro ao atualizar parcela:", error);
      return response.status(500).json({
        error: "Erro ao atualizar parcela",
        details: error.message,
      });
    }
  }

  async all({ request }) {
    return await ContaPagar.query().with("parcelas").fetch();
  }

  async getTotais({ request, response }) {
    try {
      const filters = request.get();

      let sql = `
        SELECT 
          COALESCE(SUM(CASE 
            WHEN cp.custo_variavel = true AND cp.status_geral = 2 THEN cp.valor_total
            ELSE 0 
          END), 0) as total_pago,
          
          COALESCE(SUM(CASE 
            WHEN cp.custo_variavel = true AND cp.status_geral = 3 THEN cp.valor_total
            ELSE 0 
          END), 0) as total_andamento,
          
          COALESCE(SUM(CASE 
            WHEN cp.custo_variavel = true AND cp.status_geral = 1 THEN cp.valor_total 
            ELSE 0 
          END), 0) as total_pendente_variavel,
          
          COALESCE(SUM(CASE 
            WHEN cp.custo_fixo = true AND cpp.status = 2 THEN cpp.valor
            ELSE 0 
          END), 0) as total_pago_fixo,
          
          COALESCE(SUM(CASE 
            WHEN cp.custo_fixo = true AND cpp.status = 3 THEN cpp.valor
            ELSE 0 
          END), 0) as total_andamento_fixo,
          
          COALESCE(SUM(CASE 
            WHEN cp.custo_fixo = true AND cpp.status = 1 THEN cpp.valor 
            ELSE 0 
          END), 0) as total_pendente_fixo,
          
          COALESCE(SUM(
            CASE WHEN cp.custo_variavel = true THEN cp.valor_total ELSE 0 END +
            CASE WHEN cp.custo_fixo = true THEN cpp.valor ELSE 0 END
          ), 0) as total_geral,
          
          COUNT(DISTINCT cp.id) as quantidade_contas
          
        FROM contas_pagar cp
        LEFT JOIN contas_pagar_parcelas cpp ON cp.id = cpp.conta_pagar_id
        WHERE 1=1
      `;

      let params = [];
      let paramCount = 1;

      if (filters.data_inicio && filters.data_fim) {
        sql += ` AND cp.data_inicio BETWEEN $${paramCount} AND $${paramCount + 1}`;
        params.push(filters.data_inicio, filters.data_fim);
        paramCount += 2;
      } else if (filters.data_inicio) {
        sql += ` AND cp.data_inicio >= $${paramCount}`;
        params.push(filters.data_inicio);
        paramCount += 1;
      } else if (filters.data_fim) {
        sql += ` AND cp.data_inicio <= $${paramCount}`;
        params.push(filters.data_fim);
        paramCount += 1;
      }

      if (filters.status_geral) {
        sql += ` AND cp.status_geral = $${paramCount}`;
        params.push(filters.status_geral);
        paramCount += 1;
      }

      if (filters.categoria_id) {
        sql += ` AND cp.categoria_id = $${paramCount}`;
        params.push(filters.categoria_id);
        paramCount += 1;
      }

      if (filters.prestador_id) {
        sql += ` AND cp.prestador_id = $${paramCount}`;
        params.push(filters.prestador_id);
        paramCount += 1;
      }

      const result = await Database.raw(sql, params);
      const row = result.rows ? result.rows[0] : {};

      const totalPago =
        (parseFloat(row.total_pago) || 0) +
        (parseFloat(row.total_pago_fixo) || 0);
      const totalAndamento =
        (parseFloat(row.total_andamento) || 0) +
        (parseFloat(row.total_andamento_fixo) || 0);
      const totalPendente =
        (parseFloat(row.total_pendente_variavel) || 0) +
        (parseFloat(row.total_pendente_fixo) || 0);
      const totalGeral = parseFloat(row.total_geral) || 0;
      const quantidadeContas = parseInt(row.quantidade_contas) || 0;

      return {
        total_pago: totalPago,
        total_andamento: totalAndamento,
        total_pendente: totalPendente,
        total_geral: totalGeral,
        quantidade_contas: quantidadeContas,
      };
    } catch (error) {
      console.error("Erro ao calcular totais:", error);
      return response.status(500).json({
        error: "Erro ao calcular totais",
        details: error.message,
      });
    }
  }
  async listarContasVariaveisPendentes({ request, response }) {
    try {
      const { data_inicio, data_fim } = request.get();

      const query = ContaPagar.query()
        .select(
          "contas_pagar.id",
          "contas_pagar.nome",
          "contas_pagar.data_inicio as data_vencimento",
          "contas_pagar.valor_total as valor",
          "contas_pagar.status_geral",
          "contas_pagar.prestador_id",
          "prestadores.nome as prestador_nome",
        )
        .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id")
        .where("contas_pagar.custo_variavel", true)
        .where("contas_pagar.status_geral", 1) 
        .orderBy("contas_pagar.data_inicio", "asc");

      if (data_inicio) {
        query.where("contas_pagar.data_inicio", ">=", data_inicio);
      }

      if (data_fim) {
        query.where("contas_pagar.data_inicio", "<=", data_fim);
      }

      const contas = await query.fetch();

      const contasFormatadas = contas.toJSON().map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        data_vencimento: conta.data_vencimento,
        valor: parseFloat(conta.valor),
        prestador: conta.prestador_nome || "Sem prestador",
        prestador_id: conta.prestador_id,
        status: "Pendente",
        dias_para_vencimento: this.calcularDiasParaVencimento(
          conta.data_vencimento,
        ),
      }));

      return response.json({
        total: contasFormatadas.length,
        contas: contasFormatadas,
      });
    } catch (error) {
      console.error("Erro ao buscar contas variáveis pendentes:", error);
      return response.status(500).json({
        error: "Erro ao buscar contas variáveis pendentes",
        details: error.message,
      });
    }
  }
  async listarTodasPendentes({ request, response }) {
    try {
      const { data_inicio, data_fim } = request.get();

      const queryParcelas = ContaPagarParcela.query()
        .with("conta", (builder) => {
          builder
            .select("id", "nome", "categoria_id")
            .with("categoria", (catBuilder) => {
              catBuilder.select("id", "nome");
            });
        })
        .select(
          "id",
          "conta_pagar_id",
          "descricao",
          "data_vencimento",
          "valor",
          "status",
        )
        .where("status", 1) 
        .orderBy("data_vencimento", "asc");

      const queryContas = ContaPagar.query()
        .select(
          "contas_pagar.id",
          "contas_pagar.nome",
          "contas_pagar.data_inicio as data_vencimento",
          "contas_pagar.valor_total as valor",
          "contas_pagar.status_geral",
          "contas_pagar.prestador_id",
          "contas_pagar.categoria_id",
          "categorias.nome as categoria_nome",
          "prestadores.nome as prestador_nome",
        )
        .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id")
        .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id")
        .where("contas_pagar.custo_variavel", true) 
        .where("contas_pagar.status_geral", 1) 
        .orderBy("contas_pagar.data_inicio", "asc");

      if (data_inicio) {
        queryParcelas.where("data_vencimento", ">=", data_inicio);
        queryContas.where("contas_pagar.data_inicio", ">=", data_inicio);
      }

      if (data_fim) {
        queryParcelas.where("data_vencimento", "<=", data_fim);
        queryContas.where("contas_pagar.data_inicio", "<=", data_fim);
      }

      const [parcelas, contas] = await Promise.all([
        queryParcelas.fetch(),
        queryContas.fetch(),
      ]);

      const parcelasFormatadas = parcelas.toJSON().map((parcela) => ({
        id: parcela.id,
        tipo: "Custo Fixo",
        conta_id: parcela.conta_pagar_id,
        nome_conta: parcela.conta?.nome || "Conta não encontrada",
        categoria: parcela.conta?.categoria?.nome || "Não categorizado",
        descricao_parcela: parcela.descricao,
        data_vencimento: parcela.data_vencimento,
        valor: parseFloat(parcela.valor),
        status: "Pendente",
        dias_para_vencimento: this.calcularDiasParaVencimento(
          parcela.data_vencimento,
        ),
      }));

      const contasFormatadas = contas.toJSON().map((conta) => ({
        id: conta.id,
        tipo: "Custo Variável",
        conta_id: conta.id,
        nome_conta: conta.nome,
        categoria: conta.categoria_nome || "Não categorizado",
        descricao_parcela: "Única", 
        data_vencimento: conta.data_vencimento,
        valor: parseFloat(conta.valor),
        prestador: conta.prestador_nome || "Sem prestador",
        prestador_id: conta.prestador_id,
        status: "Pendente",
        dias_para_vencimento: this.calcularDiasParaVencimento(
          conta.data_vencimento,
        ),
      }));

      const todasPendentes = [...parcelasFormatadas, ...contasFormatadas].sort(
        (a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento),
      );

      return response.json({
        total: todasPendentes.length,
        total_fixos: parcelasFormatadas.length,
        total_variaveis: contasFormatadas.length,
        parcelas: todasPendentes,
      });
    } catch (error) {
      console.error("Erro ao buscar itens pendentes:", error);
      return response.status(500).json({
        error: "Erro ao buscar itens pendentes",
        details: error.message,
      });
    }
  }
  async imprimir({ request, response }) {
    try {
      const filters = request.get();

      const query = ContaPagar.query()
        .with("parcelas", (builder) => {
          builder.select(
            "id",
            "conta_pagar_id",
            "descricao",
            "data_vencimento",
            "data_pagamento",
            "valor",
            "status",
          );
        })
        .with("categoria")
        .with("prestador")
        .select(
          "contas_pagar.id",
          "contas_pagar.nome",
          "contas_pagar.categoria_id",
          "contas_pagar.data_inicio",
          "contas_pagar.data_fim",
          "contas_pagar.valor_mensal",
          "contas_pagar.valor_total",
          "contas_pagar.status_geral",
          "contas_pagar.custo_fixo",
          "contas_pagar.custo_variavel",
          "contas_pagar.created_at",
          "categorias.nome as categoria_nome",
          "prestadores.nome as prestador_nome",
        )
        .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id")
        .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id");

      if (filters.search) {
        query.where("contas_pagar.nome", "LIKE", `%${filters.search}%`);
      }

      if (filters.status_geral) {
        query.where("contas_pagar.status_geral", filters.status_geral);
      }

      if (filters.categoria_id) {
        query.where("contas_pagar.categoria_id", filters.categoria_id);
      }

      if (filters.prestador_id) {
        query.where("contas_pagar.prestador_id", filters.prestador_id);
      }

      if (filters.data_inicio && filters.data_fim) {
        query.whereBetween("contas_pagar.data_inicio", [
          filters.data_inicio,
          filters.data_fim,
        ]);
      } else if (filters.data_inicio) {
        query.where("contas_pagar.data_inicio", ">=", filters.data_inicio);
      } else if (filters.data_fim) {
        query.where("contas_pagar.data_inicio", "<=", filters.data_fim);
      }

      query.orderBy("contas_pagar.created_at", "desc");

      const contas = await query.fetch();
      const contasJson = contas.toJSON();

      const totais = await this.getTotaisComFiltros(filters);

      const dadosImpressao = {
        data_geracao: new Date().toLocaleString("pt-BR"),
        filtros_aplicados: {
          pesquisa: filters.search || "Todos",
          status:
            filters.status_geral === "1"
              ? "Pendente"
              : filters.status_geral === "2"
                ? "Pago"
                : filters.status_geral === "3"
                  ? "Em Andamento"
                  : "Todos",
          categoria: filters.categoria_nome || filters.categoria_id || "Todas",
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
          total_geral: totais.total_geral,
          total_pago: totais.total_pago,
          total_pendente: totais.total_pendente,
          total_andamento: totais.total_andamento,
          quantidade_contas: totais.quantidade_contas,
        },
        contas: contasJson.map((conta) => ({
          id: conta.id,
          nome: conta.nome,
          tipo: conta.custo_fixo ? "Custo Fixo" : "Custo Variável",
          categoria: conta.categoria_nome || "Não categorizado",
          prestador: conta.prestador_nome || "Não informado",
          data_inicio: conta.data_inicio,
          data_fim: conta.data_fim,
          valor_mensal: conta.valor_mensal
            ? parseFloat(conta.valor_mensal)
            : null,
          valor_total: parseFloat(conta.valor_total),
          status:
            conta.status_geral === 2
              ? "Pago"
              : conta.status_geral === 3
                ? "Em Andamento"
                : "Pendente",
          parcelas: (conta.parcelas || []).map((p) => ({
            descricao: p.descricao,
            data_vencimento: p.data_vencimento,
            valor: parseFloat(p.valor),
            status:
              p.status === 2
                ? "Pago"
                : p.status === 3
                  ? "Em Andamento"
                  : "Pendente",
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

  async getTotaisComFiltros(filters) {
    let sql = `
    SELECT 
      COALESCE(SUM(CASE 
        WHEN cp.custo_variavel = true AND cp.status_geral = 2 THEN cp.valor_total
        ELSE 0 
      END), 0) as total_pago,
      
      COALESCE(SUM(CASE 
        WHEN cp.custo_variavel = true AND cp.status_geral = 3 THEN cp.valor_total
        ELSE 0 
      END), 0) as total_andamento,
      
      COALESCE(SUM(CASE 
        WHEN cp.custo_variavel = true AND cp.status_geral = 1 THEN cp.valor_total 
        ELSE 0 
      END), 0) as total_pendente_variavel,
      
      COALESCE(SUM(CASE 
        WHEN cp.custo_fixo = true AND cpp.status = 2 THEN cpp.valor
        ELSE 0 
      END), 0) as total_pago_fixo,
      
      COALESCE(SUM(CASE 
        WHEN cp.custo_fixo = true AND cpp.status = 3 THEN cpp.valor
        ELSE 0 
      END), 0) as total_andamento_fixo,
      
      COALESCE(SUM(CASE 
        WHEN cp.custo_fixo = true AND cpp.status = 1 THEN cpp.valor 
        ELSE 0 
      END), 0) as total_pendente_fixo,
      
      COALESCE(SUM(
        CASE WHEN cp.custo_variavel = true THEN cp.valor_total ELSE 0 END +
        CASE WHEN cp.custo_fixo = true THEN cpp.valor ELSE 0 END
      ), 0) as total_geral,
      
      COUNT(DISTINCT cp.id) as quantidade_contas
      
    FROM contas_pagar cp
    LEFT JOIN contas_pagar_parcelas cpp ON cp.id = cpp.conta_pagar_id
    WHERE 1=1
  `;

    let params = [];
    let paramCount = 1;

    if (filters.data_inicio && filters.data_fim) {
      sql += ` AND cp.data_inicio BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(filters.data_inicio, filters.data_fim);
      paramCount += 2;
    } else if (filters.data_inicio) {
      sql += ` AND cp.data_inicio >= $${paramCount}`;
      params.push(filters.data_inicio);
      paramCount += 1;
    } else if (filters.data_fim) {
      sql += ` AND cp.data_inicio <= $${paramCount}`;
      params.push(filters.data_fim);
      paramCount += 1;
    }

    if (filters.status_geral) {
      sql += ` AND cp.status_geral = $${paramCount}`;
      params.push(filters.status_geral);
      paramCount += 1;
    }

    if (filters.categoria_id) {
      sql += ` AND cp.categoria_id = $${paramCount}`;
      params.push(filters.categoria_id);
      paramCount += 1;
    }

    if (filters.prestador_id) {
      sql += ` AND cp.prestador_id = $${paramCount}`;
      params.push(filters.prestador_id);
      paramCount += 1;
    }

    if (filters.search) {
      sql += ` AND cp.nome LIKE $${paramCount}`;
      params.push(`%${filters.search}%`);
      paramCount += 1;
    }

    const result = await Database.raw(sql, params);
    const row = result.rows ? result.rows[0] : {};

    return {
      total_pago:
        (parseFloat(row.total_pago) || 0) +
        (parseFloat(row.total_pago_fixo) || 0),
      total_andamento:
        (parseFloat(row.total_andamento) || 0) +
        (parseFloat(row.total_andamento_fixo) || 0),
      total_pendente:
        (parseFloat(row.total_pendente_variavel) || 0) +
        (parseFloat(row.total_pendente_fixo) || 0),
      total_geral: parseFloat(row.total_geral) || 0,
      quantidade_contas: parseInt(row.quantidade_contas) || 0,
    };
  }
}

module.exports = ContaPagarController;
