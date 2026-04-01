"use strict";

const PalestraCurso = use("App/Models/PalestraCurso");
const Database = use("Database");
const RelatorioPalestraCurso = use("App/Models/RelatorioPalestraCurso");

class RelatorioPalestraCursoController {
  async gerarRelatorios({ params, request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const curso = await PalestraCurso.findOrFail(params.id);
      const data = request.only([
        "status_pagamento",
        "tipo_pagamento",
        "forma_pagamento",
        "qtd_parcelas",
        "primeira_data_parcela",
      ]);

      await RelatorioPalestraCurso.query()
        .where("palestra_curso_id", curso.id)
        .delete(trx);

      if (data.tipo_pagamento == 2 && data.qtd_parcelas > 1) {
        const valorParcela = (curso.valor / data.qtd_parcelas).toFixed(2);
        const dataBase = data.primeira_data_parcela || curso.data;

        for (let i = 1; i <= data.qtd_parcelas; i++) {
          const dataVencimento = new Date(dataBase);
          dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));

          await RelatorioPalestraCurso.create(
            {
              palestra_curso_id: curso.id,
              numero_parcela: i,
              valor: valorParcela,
              data_vencimento: dataVencimento,
              status_pagamento: i === 1 ? data.status_pagamento : 2,
              data_pagamento:
                i === 1 && data.status_pagamento == 1 ? new Date() : null,
            },
            trx,
          );
        }
      } else {
        await RelatorioPalestraCurso.create(
          {
            palestra_curso_id: curso.id,
            numero_parcela: 1,
            valor: curso.valor,
            data_vencimento: curso.data,
            status_pagamento: data.status_pagamento,
            data_pagamento: data.status_pagamento == 1 ? new Date() : null,
          },
          trx,
        );
      }

      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Relatórios gerados com sucesso",
        data: await RelatorioPalestraCurso.query()
          .where("palestra_curso_id", curso.id)
          .fetch(),
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao gerar relatórios",
        error: error.message,
      });
    }
  }

  async listAllPagamentos({ request, response }) {
    try {
      const { status, page = 1, perPage = 10 } = request.all();

      const query = RelatorioPalestraCurso.query()
        .with("palestraCurso", (builder) => {
          builder.select(
            "id",
            "nome",
            "tipo_pagamento",
            "valor as valor_total",
          );
        })
        .orderBy("data_vencimento", "asc");

      if (status) {
        query.where("status_pagamento", status);
      }

      const pagamentos = await query.paginate(page, perPage);

      return response.status(200).json({
        success: true,
        data: pagamentos,
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar pagamentos",
        error: error.message,
      });
    }
  }

  async updateParcelaStatus({ params, request, response }) {
    try {
      const { status_pagamento, data_pagamento } = request.only([
        "status_pagamento",
        "data_pagamento",
      ]);

      const relatorio = await RelatorioPalestraCurso.findOrFail(params.id);

      relatorio.merge({
        status_pagamento,
        data_pagamento:
          status_pagamento == 1 ? data_pagamento || new Date() : null,
      });

      await relatorio.save();

      return response.status(200).json({
        success: true,
        message: "Status da parcela atualizado com sucesso.",
        data: relatorio,
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao atualizar status da parcela.",
        error: error.message,
      });
    }
  }

  async getRelatorioTotal({ request, response }) {
    try {
      const {
        cliente_id,
        tipo_palestra_id,
        data_inicio,
        data_fim,
        status_pagamento,
        page = 1,
        perPage = 10,
      } = request.all();

      const query = PalestraCurso.query()
        .with("cliente")
        .with("tipoPalestra")
        .with("parcelas", (builder) => {
          builder.orderBy("data_vencimento", "asc");
        });

      if (cliente_id) {
        query.where("cliente_id", cliente_id);
      }

      if (tipo_palestra_id) {
        query.where("tipo_palestra_id", tipo_palestra_id);
      }

      if (data_inicio) {
        query.where("data", ">=", data_inicio);
      }

      if (data_fim) {
        query.where("data", "<=", data_fim);
      }

      const palestras = await query.fetch();

      let totalGeral = 0;
      let totalPago = 0;
      let totalPendente = 0;

      const palestrasComStatus = palestras.toJSON().map((palestra) => {
        let valorPalestra = parseFloat(palestra.valor);
        let valorPago = 0;

        if (palestra.parcelas && palestra.parcelas.length > 0) {
          valorPago = palestra.parcelas
            .filter((p) => p.status_pagamento === 1)
            .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
        } else {
          if (palestra.status_pagamento === 1) {
            valorPago = valorPalestra;
          }
        }

        const valorPendente = valorPalestra - valorPago;
        const status = valorPago === valorPalestra ? "Pago" : "Pendente";

        totalGeral += valorPalestra;
        totalPago += valorPago;
        totalPendente += valorPendente;

        return {
          ...palestra,
          valor_pago: valorPago,
          valor_pendente: valorPendente,
          status,
          valor_formatado: `R$ ${valorPalestra.toFixed(2).replace(".", ",")}`,
          valor_pago_formatado: `R$ ${valorPago.toFixed(2).replace(".", ",")}`,
          valor_pendente_formatado: `R$ ${valorPendente.toFixed(2).replace(".", ",")}`,
        };
      });

      let palestrasFiltradas = palestrasComStatus;
      if (status_pagamento) {
        const statusMap = {
          Pago: "Pago",
          Pendente: "Pendente",
        };
        const statusFiltro = statusMap[status_pagamento];
        if (statusFiltro) {
          palestrasFiltradas = palestrasComStatus.filter(
            (p) => p.status === statusFiltro,
          );
        }
      }

      const totaisFiltrados = palestrasFiltradas.reduce(
        (acc, palestra) => {
          acc.totalGeral += parseFloat(palestra.valor);
          acc.totalPago += palestra.valor_pago;
          acc.totalPendente += palestra.valor_pendente;
          return acc;
        },
        { totalGeral: 0, totalPago: 0, totalPendente: 0 },
      );

      const start = (parseInt(page) - 1) * parseInt(perPage);
      const end = start + parseInt(perPage);
      const dadosPaginados = palestrasFiltradas.slice(start, end);

      return response.status(200).json({
        success: true,
        message: "Relatório total gerado com sucesso.",
        data: {
          totais: {
            total_geral: totalGeral,
            total_pago: totalPago,
            total_pendente: totalPendente,
            total_geral_formatado: `R$ ${totalGeral.toFixed(2).replace(".", ",")}`,
            total_pago_formatado: `R$ ${totalPago.toFixed(2).replace(".", ",")}`,
            total_pendente_formatado: `R$ ${totalPendente.toFixed(2).replace(".", ",")}`,
          },
          totais_filtrados: {
            total_geral: totaisFiltrados.totalGeral,
            total_pago: totaisFiltrados.totalPago,
            total_pendente: totaisFiltrados.totalPendente,
            total_geral_formatado: `R$ ${totaisFiltrados.totalGeral.toFixed(2).replace(".", ",")}`,
            total_pago_formatado: `R$ ${totaisFiltrados.totalPago.toFixed(2).replace(".", ",")}`,
            total_pendente_formatado: `R$ ${totaisFiltrados.totalPendente.toFixed(2).replace(".", ",")}`,
          },
          paginacao: {
            pagina_atual: parseInt(page),
            itens_por_pagina: parseInt(perPage),
            total_itens: palestrasFiltradas.length,
            total_paginas: Math.ceil(
              palestrasFiltradas.length / parseInt(perPage),
            ),
          },
          dados: dadosPaginados,
        },
      });
    } catch (error) {
      console.error("Erro ao gerar relatório total:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao gerar relatório total.",
        error: error.message,
      });
    }
  }
}

module.exports = RelatorioPalestraCursoController;
