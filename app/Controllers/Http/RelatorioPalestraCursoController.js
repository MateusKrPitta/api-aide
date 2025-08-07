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

      // Remove relatórios existentes (se houver)
      await RelatorioPalestraCurso.query()
        .where("palestra_curso_id", curso.id)
        .delete(trx);

      // Cria novos relatórios
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
            trx
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
          trx
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
            "valor as valor_total"
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
}

module.exports = RelatorioPalestraCursoController;
