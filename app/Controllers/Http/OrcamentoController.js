"use strict";

const Orcamento = use("App/Models/Orcamento");
const OrcamentoPrestador = use("App/Models/OrcamentoPrestador");
const OrcamentoServico = use("App/Models/OrcamentoServico");
const Database = use("Database");
const Helpers = use("Helpers");
const ParcelasServico = use("App/Models/ParcelasServico");
const moment = require("moment");

class OrcamentoController {
  async index({ request, response }) {
    try {
      const { page = 1, limit = 10, search = "" } = request.all();

      let query = Orcamento.query()
        .with("cliente")
        .with("prestadores.prestador")
        .with("prestadores.servicos.servico")
        .with("arquivos")
        .orderBy("id", "desc");

      if (search) {
        query = query.where(function () {
          this.where("nome", "LIKE", `%${search}%`)
            .orWhereHas("cliente", (builder) => {
              builder.where("nome", "LIKE", `%${search}%`);
            })
            .orWhereHas("prestadores.prestador", (builder) => {
              builder.where("nome", "LIKE", `%${search}%`);
            })
            .orWhereHas("prestadores.servicos.servico", (builder) => {
              builder.where("nome", "LIKE", `%${search}%`);
            });
        });
      }

      const paginatedOrcamentos = await query.paginate(page, limit);

      const orcamentosData =
        paginatedOrcamentos.data || paginatedOrcamentos.rows || [];

      const total = paginatedOrcamentos.total || orcamentosData.length;

      const perPage = parseInt(paginatedOrcamentos.perPage || limit);
      const currentPage = parseInt(paginatedOrcamentos.page || page);
      const lastPage = Math.ceil(total / perPage);

      const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
      const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;

      return response.status(200).json({
        success: true,
        message: `${total} orçamento(s) encontrado(s)`,
        data: orcamentosData,
        pagination: {
          total: total,
          per_page: perPage,
          current_page: currentPage,
          last_page: lastPage,
          from: from,
          to: to,
        },
      });
    } catch (error) {
      console.error("Erro ao listar orçamentos:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao listar orçamentos",
        error: error.message,
      });
    }
  }

  async store({ request, response }) {
    const trx = await Database.beginTransaction();

    try {
      const data = request.all();
      const arquivos = request.file("arquivos", {
        types: ["pdf"],
        size: "10mb",
        multiple: true,
      });

      if (!data.nome || !data.cliente_id) {
        return response.status(400).json({
          success: false,
          message: "Nome e cliente_id são obrigatórios",
        });
      }

      const orcamento = await Orcamento.create(
        {
          nome: data.nome,
          cliente_id: data.cliente_id,
        },
        trx,
      );

      if (arquivos) {
        await arquivos.moveAll(
          Helpers.tmpPath("uploads/orcamentos"),
          (file) => ({
            name: `${Date.now()}-${file.clientName}`,
          }),
        );

        if (arquivos.movedAll()) {
          await Promise.all(
            arquivos.movedList().map((file) =>
              orcamento.arquivos().create(
                {
                  nome_arquivo: file.clientName,
                  caminho_arquivo: file.fileName,
                  mime_type: file.type,
                },
                trx,
              ),
            ),
          );
        } else {
          throw new Error(arquivos.errors());
        }
      }

      for (const prestador of data.prestadores || []) {
        const orcamentoPrestador = await OrcamentoPrestador.create(
          {
            orcamento_id: orcamento.id,
            prestador_id: prestador.prestador_id,
          },
          trx,
        );

        for (const servico of prestador.servicos || []) {
          const novoServico = await OrcamentoServico.create(
            {
              orcamento_prestador_id: orcamentoPrestador.id,
              servico_id: servico.servico_id,
              tipo_pagamento: servico.tipo_pagamento,
              metodo_pagamento: servico.metodo_pagamento,
              numero_parcelas: servico.numero_parcelas,
              valor_total: servico.valor_total,
              valor_parcela: servico.valor_parcela,
              comissao: servico.comissao,
              valor_prestador: servico.valor_prestador,
              data_inicio: servico.data_inicio,
              data_entrega: servico.data_entrega,
              data_pagamento: servico.data_pagamento,
            },
            trx,
          );

          const totalParcelas = novoServico.numero_parcelas || 1;

          const valorParcela =
            parseFloat(novoServico.valor_total) / totalParcelas;
          const valorPrestadorParcela =
            parseFloat(novoServico.valor_prestador) / totalParcelas;
          const valorComissaoParcela =
            parseFloat(novoServico.comissao) / totalParcelas;

          for (let i = 0; i < totalParcelas; i++) {
            await ParcelasServico.create(
              {
                orcamento_servico_id: novoServico.id,
                numero_parcela: i + 1,
                data_pagamento: moment(novoServico.data_pagamento)
                  .add(i, "months")
                  .format("YYYY-MM-DD"),
                valor_parcela: valorParcela.toFixed(2),
                valor_prestador: valorPrestadorParcela.toFixed(2),
                valor_comissao: valorComissaoParcela.toFixed(2),
                status_pagamento_prestador: 1,
                status_pagamento_comissao: 1,
              },
              trx,
            );
          }
        }
      }

      await trx.commit();

      return response.status(201).json({
        success: true,
        data: await Orcamento.query()
          .where("id", orcamento.id)
          .with("cliente")
          .with("prestadores.prestador")
          .with("prestadores.servicos.servico")
          .with("arquivos")
          .first(),
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao criar orçamento",
        error: error.message,
      });
    }
  }

  async destroy({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const orcamento = await Orcamento.findOrFail(params.id);

      const arquivos = await orcamento.arquivos().fetch();
      const fs = Helpers.promisify(require("fs"));

      for (const arquivo of arquivos.rows) {
        const filePath = Helpers.tmpPath(
          `uploads/orcamentos/${arquivo.caminho_arquivo}`,
        );
        if (await fs.exists(filePath)) {
          await fs.unlink(filePath);
        }
      }

      await orcamento.delete(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Serviço excluídos com sucesso!",
      });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({
        success: false,
        message: "Erro ao excluir orçamento.",
        error: error.message,
      });
    }
  }

  async update({ params, request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const orcamento = await Orcamento.findOrFail(params.id);
      const data = request.all();
      const arquivos = request.file("arquivos", {
        types: ["pdf"],
        size: "10mb",
        multiple: true,
      });

      orcamento.merge({
        nome: data.nome || orcamento.nome,
        cliente_id: data.cliente_id || orcamento.cliente_id,
      });
      await orcamento.save(trx);

      if (arquivos) {
        await arquivos.moveAll(
          Helpers.tmpPath("uploads/orcamentos"),
          (file) => ({
            name: `${Date.now()}-${file.clientName}`,
          }),
        );

        if (arquivos.movedAll()) {
          await Promise.all(
            arquivos.movedList().map((file) =>
              orcamento.arquivos().create(
                {
                  nome_arquivo: file.clientName,
                  caminho_arquivo: file.fileName,
                  mime_type: file.type,
                },
                trx,
              ),
            ),
          );
        } else {
          throw new Error(arquivos.errors());
        }
      }

      if (data.prestadores) {
        await OrcamentoPrestador.query()
          .where("orcamento_id", orcamento.id)
          .delete(trx);

        for (const prestador of data.prestadores) {
          const orcamentoPrestador = await OrcamentoPrestador.create(
            {
              orcamento_id: orcamento.id,
              prestador_id: prestador.prestador_id,
            },
            trx,
          );

          if (prestador.servicos) {
            for (const servico of prestador.servicos) {
              const novoServico = await OrcamentoServico.create(
                {
                  orcamento_prestador_id: orcamentoPrestador.id,
                  servico_id: servico.servico_id,
                  tipo_pagamento: servico.tipo_pagamento,
                  metodo_pagamento: servico.metodo_pagamento,
                  numero_parcelas: servico.numero_parcelas,
                  valor_total: servico.valor_total,
                  valor_parcela: servico.valor_parcela,
                  comissao: servico.comissao,
                  valor_prestador: servico.valor_prestador,
                  data_inicio: servico.data_inicio,
                  data_entrega: servico.data_entrega,
                  data_pagamento: servico.data_pagamento,
                },
                trx,
              );

              if (novoServico.tipo_pagamento === 2) {
                const totalParcelas = novoServico.numero_parcelas || 1;
                const valorParcela =
                  parseFloat(novoServico.valor_total) / totalParcelas;
                const valorPrestadorParcela =
                  parseFloat(novoServico.valor_prestador) / totalParcelas;
                const valorComissaoParcela =
                  parseFloat(novoServico.comissao) / totalParcelas;

                for (let i = 0; i < totalParcelas; i++) {
                  await ParcelasServico.create(
                    {
                      orcamento_servico_id: novoServico.id,
                      numero_parcela: i + 1,
                      data_pagamento: moment(novoServico.data_pagamento)
                        .add(i, "months")
                        .format("YYYY-MM-DD"),
                      valor_parcela: valorParcela.toFixed(2),
                      valor_prestador: valorPrestadorParcela.toFixed(2),
                      valor_comissao: valorComissaoParcela.toFixed(2),
                      status_pagamento_prestador: 2,
                      status_pagamento_comissao: 2,
                    },
                    trx,
                  );
                }
              }
            }
          }
        }
      }

      await trx.commit();

      return response.json({
        success: true,
        data: await Orcamento.query()
          .where("id", params.id)
          .with("cliente")
          .with("prestadores.prestador")
          .with("prestadores.servicos.servico")
          .with("prestadores.servicos.parcelas")
          .with("arquivos")
          .first(),
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao atualizar orçamento",
        error: error.message,
      });
    }
  }
}

module.exports = OrcamentoController;
