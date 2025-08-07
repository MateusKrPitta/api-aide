"use strict";

const OrcamentoPrestador = use("App/Models/OrcamentoPrestador");
const ParcelasServico = use("App/Models/ParcelasServico");
// const OrcamentoRelatorio = use("App/Models/OrcamentoRelatorio");

class OrcamentoRelatorioController {
  async index({ request, response }) {
    try {
      const { orcamento_id, status } = request.get();

      const query = OrcamentoPrestador.query()
        .with("orcamento", (builder) => {
          builder
            .select("id", "nome", "cliente_id")
            .with("cliente", (clienteBuilder) => {
              clienteBuilder.select("id", "nome");
            });
        })
        .with("prestador", (builder) => {
          builder.select("id", "nome");
        })
        .with("servicos", (builder) => {
          builder
            .select(
              "id",
              "orcamento_prestador_id",
              "servico_id",
              "tipo_pagamento",
              "metodo_pagamento",
              "numero_parcelas",
              "valor_total",
              "valor_parcela",
              "comissao",
              "valor_prestador",
              "data_inicio",
              "data_entrega",
              "data_pagamento"
            )
            .with("servico", (servicoBuilder) => {
              servicoBuilder.select("id", "nome");
            })
            .with("parcelas", (parcelaBuilder) => {
              parcelaBuilder.select(
                "id",
                "orcamento_servico_id",
                "numero_parcela",
                "data_pagamento",
                "valor_parcela",
                "valor_prestador",
                "valor_comissao",
                "status_pagamento_prestador", // Substitui pago_prestador
                "status_pagamento_comissao"
              );
            });
        });

      if (orcamento_id) {
        query.where("orcamento_id", orcamento_id);
      }

      const dados = await query.fetch();

      // Processar os dados para calcular os status baseados nas parcelas
      const processedData = dados.toJSON().map((item) => {
        // Para cada serviço
        item.servicos = item.servicos.map((servico) => {
          servico.parcelas = servico.parcelas.map((parcela) => ({
            ...parcela,
            status_pagamento_prestador: parcela.status_pagamento_prestador || 1, // Padrão 1 (Pendente)
            status_pagamento_comissao: parcela.status_pagamento_comissao || 1, // Padrão 1 (Pendente)
          }));
          return servico;
        });

        // Não colocamos os status no nível superior
        return item;
      });

      const filteredData = status
        ? processedData.filter((item) =>
            item.servicos.some((servico) =>
              servico.parcelas.some(
                (parcela) =>
                  parcela.status_pagamento_prestador == status ||
                  parcela.status_pagamento_comissao == status
              )
            )
          )
        : processedData;

      return response.json({
        success: true,
        data: filteredData,
      });
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar relatórios",
        error: error.message,
      });
    }
  }

  async updatePaymentStatus({ params, request, response }) {
    try {
      const { id } = params; // ID da parcela
      const { tipo, status } = request.only(["tipo", "status"]);

      // Validações
      if (!["prestador", "comissao"].includes(tipo)) {
        return response.status(400).json({
          success: false,
          message: "Tipo deve ser 'prestador' ou 'comissao'",
        });
      }

      if (![1, 2].includes(Number(status))) {
        return response.status(400).json({
          success: false,
          message: "Status deve ser 1 (Pendente) ou 2 (Pago)",
        });
      }

      const parcela = await ParcelasServico.findOrFail(id);

      // Atualização
      if (tipo === "prestador") {
        parcela.status_pagamento_prestador = status;
      } else {
        parcela.status_pagamento_comissao = status;
      }

      await parcela.save();

      return response.status(200).json({
        success: true,
        message: `Status ${tipo} atualizado para ${
          status === 1 ? "Pendente" : "Pago"
        }`,
        data: parcela,
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao atualizar status",
        error: error.message,
      });
    }
  }
}

module.exports = OrcamentoRelatorioController;
