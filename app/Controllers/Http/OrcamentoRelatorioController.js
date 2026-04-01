"use strict";

const OrcamentoPrestador = use("App/Models/OrcamentoPrestador");
const ParcelasServico = use("App/Models/ParcelasServico");
const Database = use("Database");

class OrcamentoRelatorioController {
  async index({ request }) {
    const { page = 1, perPage = 10, ...filters } = request.get();

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
            "data_pagamento",
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
              "status_pagamento_prestador",
              "status_pagamento_comissao",
            );
          });
      });

    if (filters.orcamento_id) {
      query.where("orcamento_id", filters.orcamento_id);
    }

    if (filters.prestador_id) {
      query.where("prestador_id", filters.prestador_id);
    }

    if (filters.cliente_id) {
      query.whereHas("orcamento", (builder) => {
        builder.where("cliente_id", filters.cliente_id);
      });
    }

    if (filters.status) {
      const status = parseInt(filters.status);
      query.whereHas("servicos.parcelas", (builder) => {
        builder.where(function () {
          this.where("status_pagamento_prestador", status).orWhere(
            "status_pagamento_comissao",
            status,
          );
        });
      });
    }

    if (filters.data_inicio && filters.data_fim) {
      query.whereHas("servicos", (builder) => {
        builder.whereBetween("data_inicio", [
          filters.data_inicio,
          filters.data_fim,
        ]);
      });
    } else if (filters.data_inicio) {
      query.whereHas("servicos", (builder) => {
        builder.where("data_inicio", ">=", filters.data_inicio);
      });
    } else if (filters.data_fim) {
      query.whereHas("servicos", (builder) => {
        builder.where("data_inicio", "<=", filters.data_fim);
      });
    }

    if (filters.search) {
      query.where(function () {
        this.whereHas("orcamento", (orcamentoBuilder) => {
          orcamentoBuilder
            .where("nome", "LIKE", `%${filters.search}%`)
            .orWhereHas("cliente", (clienteBuilder) => {
              clienteBuilder.where("nome", "LIKE", `%${filters.search}%`);
            });
        })
          .orWhereHas("prestador", (prestadorBuilder) => {
            prestadorBuilder.where("nome", "LIKE", `%${filters.search}%`);
          })
          .orWhereHas("servicos", (servicoBuilder) => {
            servicoBuilder.whereHas("servico", (servicoInnerBuilder) => {
              servicoInnerBuilder.where("nome", "LIKE", `%${filters.search}%`);
            });
          });
      });
    }

    query.orderBy("created_at", "desc");

    const orcamentos = await query.paginate(page, perPage);

    const processedData = orcamentos.toJSON().data.map((item) => {
      item.servicos = item.servicos.map((servico) => {
        servico.parcelas = servico.parcelas.map((parcela) => ({
          ...parcela,
          status_pagamento_prestador: parcela.status_pagamento_prestador || 1,
          status_pagamento_comissao: parcela.status_pagamento_comissao || 1,
        }));
        return servico;
      });
      return item;
    });

    orcamentos.data = processedData;

    return orcamentos;
  }

  async getTotais({ request, response }) {
    try {
      const filters = request.get();

      const query = OrcamentoPrestador.query().with(
        "servicos.parcelas",
        (builder) => {
          builder.select(
            "id",
            "orcamento_servico_id",
            "valor_parcela",
            "valor_prestador",
            "valor_comissao",
            "status_pagamento_prestador",
            "status_pagamento_comissao",
          );
        },
      );

      if (filters.orcamento_id) {
        query.where("orcamento_id", filters.orcamento_id);
      }

      if (filters.prestador_id) {
        query.where("prestador_id", filters.prestador_id);
      }

      if (filters.cliente_id) {
        query.whereHas("orcamento", (builder) => {
          builder.where("cliente_id", filters.cliente_id);
        });
      }

      if (filters.data_inicio && filters.data_fim) {
        query.whereHas("servicos", (builder) => {
          builder.whereBetween("data_inicio", [
            filters.data_inicio,
            filters.data_fim,
          ]);
        });
      } else if (filters.data_inicio) {
        query.whereHas("servicos", (builder) => {
          builder.where("data_inicio", ">=", filters.data_inicio);
        });
      } else if (filters.data_fim) {
        query.whereHas("servicos", (builder) => {
          builder.where("data_inicio", "<=", filters.data_fim);
        });
      }

      const dados = await query.fetch();
      const dadosJSON = dados.toJSON();

      let totais = {
        prestador: {
          pendente: 0,
          pago: 0,
          total: 0,
        },
        comissao: {
          pendente: 0,
          pago: 0,
          total: 0,
        },
        geral: {
          valor_total_prestador: 0,
          valor_total_comissao: 0,
          valor_total_geral: 0,
        },
      };

      dadosJSON.forEach((item) => {
        item.servicos.forEach((servico) => {
          servico.parcelas.forEach((parcela) => {
            if (parcela.status_pagamento_prestador === 1) {
              totais.prestador.pendente +=
                parseFloat(parcela.valor_prestador) || 0;
            } else if (parcela.status_pagamento_prestador === 2) {
              totais.prestador.pago += parseFloat(parcela.valor_prestador) || 0;
            }
            totais.prestador.total += parseFloat(parcela.valor_prestador) || 0;

            if (parcela.status_pagamento_comissao === 1) {
              totais.comissao.pendente +=
                parseFloat(parcela.valor_comissao) || 0;
            } else if (parcela.status_pagamento_comissao === 2) {
              totais.comissao.pago += parseFloat(parcela.valor_comissao) || 0;
            }
            totais.comissao.total += parseFloat(parcela.valor_comissao) || 0;

            totais.geral.valor_total_prestador +=
              parseFloat(parcela.valor_prestador) || 0;
            totais.geral.valor_total_comissao +=
              parseFloat(parcela.valor_comissao) || 0;
          });
        });
      });

      totais.geral.valor_total_geral =
        totais.geral.valor_total_prestador + totais.geral.valor_total_comissao;

      const formatarValor = (valor) => parseFloat(valor.toFixed(2));

      return response.json({
        success: true,
        data: {
          prestador: {
            pendente: formatarValor(totais.prestador.pendente),
            pago: formatarValor(totais.prestador.pago),
            total: formatarValor(totais.prestador.total),
          },
          comissao: {
            pendente: formatarValor(totais.comissao.pendente),
            pago: formatarValor(totais.comissao.pago),
            total: formatarValor(totais.comissao.total),
          },
          geral: {
            valor_total_prestador: formatarValor(
              totais.geral.valor_total_prestador,
            ),
            valor_total_comissao: formatarValor(
              totais.geral.valor_total_comissao,
            ),
            valor_total_geral: formatarValor(totais.geral.valor_total_geral),
          },
          resumo: {
            total_pendente: formatarValor(
              totais.prestador.pendente + totais.comissao.pendente,
            ),
            total_pago: formatarValor(
              totais.prestador.pago + totais.comissao.pago,
            ),
            total_geral: formatarValor(
              totais.prestador.total + totais.comissao.total,
            ),
          },
        },
      });
    } catch (error) {
      console.error("Erro ao buscar totais:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar totais",
        error: error.message,
      });
    }
  }

  async getServicosResumido({ request }) {
    const { page = 1, perPage = 10, ...filters } = request.get();

    const query = OrcamentoPrestador.query()
      .select("id", "orcamento_id", "prestador_id", "created_at")
      .with("orcamento", (builder) => {
        builder
          .select("id", "nome", "cliente_id", "created_at")
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
            "valor_total",
            "comissao",
            "valor_prestador",
            "data_inicio",
            "data_entrega",
            "numero_parcelas",
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
              "status_pagamento_prestador",
              "status_pagamento_comissao",
            );
          });
      });

    if (filters.data_inicio && filters.data_fim) {
      query.whereHas("servicos", (servicoBuilder) => {
        servicoBuilder.whereBetween("data_inicio", [
          filters.data_inicio,
          filters.data_fim,
        ]);
      });
    } else if (filters.data_inicio) {
      query.whereHas("servicos", (servicoBuilder) => {
        servicoBuilder.where("data_inicio", ">=", filters.data_inicio);
      });
    } else if (filters.data_fim) {
      query.whereHas("servicos", (servicoBuilder) => {
        servicoBuilder.where("data_inicio", "<=", filters.data_fim);
      });
    }

    if (filters.prestador_id) {
      query.where("prestador_id", filters.prestador_id);
    }

    if (filters.cliente_id) {
      query.whereHas("orcamento", (orcamentoBuilder) => {
        orcamentoBuilder.where("cliente_id", filters.cliente_id);
      });
    }

    if (filters.status) {
      const status = parseInt(filters.status);
      query.whereHas("servicos.parcelas", (builder) => {
        builder.where("status_pagamento_prestador", status);
      });
    }

    if (filters.search) {
      query.where(function () {
        this.whereHas("orcamento", (orcamentoBuilder) => {
          orcamentoBuilder
            .where("nome", "LIKE", `%${filters.search}%`)
            .orWhereHas("cliente", (clienteBuilder) => {
              clienteBuilder.where("nome", "LIKE", `%${filters.search}%`);
            });
        })
          .orWhereHas("prestador", (prestadorBuilder) => {
            prestadorBuilder.where("nome", "LIKE", `%${filters.search}%`);
          })
          .orWhereHas("servicos", (servicoBuilder) => {
            servicoBuilder.whereHas("servico", (servicoInnerBuilder) => {
              servicoInnerBuilder.where("nome", "LIKE", `%${filters.search}%`);
            });
          });
      });
    }

    query.orderBy("created_at", "desc");

    const orcamentos = await query.paginate(page, perPage);
    const dadosJSON = orcamentos.toJSON().data;

    const servicosFormatados = [];

    dadosJSON.forEach((orcamentoPrestador) => {
      const orcamento = orcamentoPrestador.orcamento;
      const prestador = orcamentoPrestador.prestador;

      orcamentoPrestador.servicos.forEach((servico) => {
        const servicoInfo = servico.servico;
        const parcelas = servico.parcelas || [];

        let statusPrestador = "pendente";
        let statusPrestadorCodigo = 1;

        if (parcelas.length > 0) {
          const temParcelaPaga = parcelas.some(
            (parcela) => parcela.status_pagamento_prestador === 2,
          );

          const todasPagas = parcelas.every(
            (parcela) => parcela.status_pagamento_prestador === 2,
          );

          if (todasPagas) {
            statusPrestador = "pago";
            statusPrestadorCodigo = 3;
          } else if (temParcelaPaga) {
            statusPrestador = "em_andamento";
            statusPrestadorCodigo = 2;
          } else {
            statusPrestador = "pendente";
            statusPrestadorCodigo = 1;
          }
        }

        let statusComissao = "pendente";
        let statusComissaoCodigo = 1;

        if (parcelas.length > 0) {
          const temParcelaComissaoPaga = parcelas.some(
            (parcela) => parcela.status_pagamento_comissao === 2,
          );

          const todasComissaoPagas = parcelas.every(
            (parcela) => parcela.status_pagamento_comissao === 2,
          );

          if (todasComissaoPagas) {
            statusComissao = "pago";
            statusComissaoCodigo = 3;
          } else if (temParcelaComissaoPaga) {
            statusComissao = "em_andamento";
            statusComissaoCodigo = 2;
          } else {
            statusComissao = "pendente";
            statusComissaoCodigo = 1;
          }
        }

        const totalPrestadorPago = parcelas
          .filter((p) => p.status_pagamento_prestador === 2)
          .reduce((sum, p) => sum + parseFloat(p.valor_prestador || 0), 0);

        const totalPrestadorPendente = parcelas
          .filter((p) => p.status_pagamento_prestador === 1)
          .reduce((sum, p) => sum + parseFloat(p.valor_prestador || 0), 0);

        const totalComissaoPago = parcelas
          .filter((p) => p.status_pagamento_comissao === 2)
          .reduce((sum, p) => sum + parseFloat(p.valor_comissao || 0), 0);

        const totalComissaoPendente = parcelas
          .filter((p) => p.status_pagamento_comissao === 1)
          .reduce((sum, p) => sum + parseFloat(p.valor_comissao || 0), 0);

        servicosFormatados.push({
          id: servico.id,
          servico_id: servico.servico_id,
          servico_nome: servicoInfo
            ? servicoInfo.nome
            : "Serviço não encontrado",
          orcamento_id: orcamento.id,
          orcamento_nome: orcamento.nome,
          cliente_id: orcamento.cliente ? orcamento.cliente.id : null,
          cliente_nome: orcamento.cliente
            ? orcamento.cliente.nome
            : "Cliente não encontrado",
          prestador_id: prestador ? prestador.id : null,
          prestador_nome: prestador
            ? prestador.nome
            : "Prestador não encontrado",
          data_inicio: servico.data_inicio,
          data_entrega: servico.data_entrega,
          valor_total: parseFloat(servico.valor_total || 0).toFixed(2),
          valor_prestador: parseFloat(servico.valor_prestador || 0).toFixed(2),
          comissao: parseFloat(servico.comissao || 0).toFixed(2),
          numero_parcelas: servico.numero_parcelas || 0,

          status_prestador: statusPrestador,
          status_prestador_codigo: statusPrestadorCodigo,
          status_prestador_texto:
            statusPrestadorCodigo === 1
              ? "Pendente"
              : statusPrestadorCodigo === 2
                ? "Em Andamento"
                : "Pago",
          total_prestador_pago: parseFloat(totalPrestadorPago).toFixed(2),
          total_prestador_pendente: parseFloat(totalPrestadorPendente).toFixed(
            2,
          ),
          parcelas_prestador_pagas: parcelas.filter(
            (p) => p.status_pagamento_prestador === 2,
          ).length,
          parcelas_prestador_pendentes: parcelas.filter(
            (p) => p.status_pagamento_prestador === 1,
          ).length,

          status_comissao: statusComissao,
          status_comissao_codigo: statusComissaoCodigo,
          status_comissao_texto:
            statusComissaoCodigo === 1
              ? "Pendente"
              : statusComissaoCodigo === 2
                ? "Em Andamento"
                : "Pago",
          total_comissao_pago: parseFloat(totalComissaoPago).toFixed(2),
          total_comissao_pendente: parseFloat(totalComissaoPendente).toFixed(2),
          parcelas_comissao_pagas: parcelas.filter(
            (p) => p.status_pagamento_comissao === 2,
          ).length,
          parcelas_comissao_pendentes: parcelas.filter(
            (p) => p.status_pagamento_comissao === 1,
          ).length,

          status: statusPrestador,
          status_codigo: statusPrestadorCodigo,
          status_texto:
            statusPrestadorCodigo === 1
              ? "Pendente"
              : statusPrestadorCodigo === 2
                ? "Em Andamento"
                : "Pago",
          total_pago: parseFloat(totalPrestadorPago).toFixed(2),
          total_pendente: parseFloat(totalPrestadorPendente).toFixed(2),
          parcelas_pagas: parcelas.filter(
            (p) => p.status_pagamento_prestador === 2,
          ).length,
          parcelas_pendentes: parcelas.filter(
            (p) => p.status_pagamento_prestador === 1,
          ).length,

          data_criacao: orcamento.created_at,

          parcelas_detalhes: parcelas.map((p) => ({
            numero: p.numero_parcela,
            status_prestador: p.status_pagamento_prestador,
            status_comissao: p.status_pagamento_comissao,
          })),
        });
      });
    });

    const totais = {
      total_valor: 0,
      total_comissao: 0,
      total_valor_prestador: 0,
      quantidade_servicos: servicosFormatados.length,

      status_prestador_count: {
        pendente: 0,
        em_andamento: 0,
        pago: 0,
      },

      status_comissao_count: {
        pendente: 0,
        em_andamento: 0,
        pago: 0,
      },

      totais_por_status_prestador: {
        pendente: 0,
        em_andamento: 0,
        pago: 0,
      },
      totais_por_status_comissao: {
        pendente: 0,
        em_andamento: 0,
        pago: 0,
      },
    };

    servicosFormatados.forEach((servico) => {
      totais.total_valor += parseFloat(servico.valor_total);
      totais.total_comissao += parseFloat(servico.comissao);
      totais.total_valor_prestador += parseFloat(servico.valor_prestador);

      if (servico.status_prestador === "pendente") {
        totais.status_prestador_count.pendente++;
        totais.totais_por_status_prestador.pendente += parseFloat(
          servico.valor_prestador,
        );
      } else if (servico.status_prestador === "em_andamento") {
        totais.status_prestador_count.em_andamento++;
        totais.totais_por_status_prestador.em_andamento += parseFloat(
          servico.valor_prestador,
        );
      } else if (servico.status_prestador === "pago") {
        totais.status_prestador_count.pago++;
        totais.totais_por_status_prestador.pago += parseFloat(
          servico.valor_prestador,
        );
      }

      if (servico.status_comissao === "pendente") {
        totais.status_comissao_count.pendente++;
        totais.totais_por_status_comissao.pendente += parseFloat(
          servico.comissao,
        );
      } else if (servico.status_comissao === "em_andamento") {
        totais.status_comissao_count.em_andamento++;
        totais.totais_por_status_comissao.em_andamento += parseFloat(
          servico.comissao,
        );
      } else if (servico.status_comissao === "pago") {
        totais.status_comissao_count.pago++;
        totais.totais_por_status_comissao.pago += parseFloat(servico.comissao);
      }
    });

    totais.total_valor = parseFloat(totais.total_valor.toFixed(2));
    totais.total_comissao = parseFloat(totais.total_comissao.toFixed(2));
    totais.total_valor_prestador = parseFloat(
      totais.total_valor_prestador.toFixed(2),
    );

    totais.totais_por_status_prestador.pendente = parseFloat(
      totais.totais_por_status_prestador.pendente.toFixed(2),
    );
    totais.totais_por_status_prestador.em_andamento = parseFloat(
      totais.totais_por_status_prestador.em_andamento.toFixed(2),
    );
    totais.totais_por_status_prestador.pago = parseFloat(
      totais.totais_por_status_prestador.pago.toFixed(2),
    );

    totais.totais_por_status_comissao.pendente = parseFloat(
      totais.totais_por_status_comissao.pendente.toFixed(2),
    );
    totais.totais_por_status_comissao.em_andamento = parseFloat(
      totais.totais_por_status_comissao.em_andamento.toFixed(2),
    );
    totais.totais_por_status_comissao.pago = parseFloat(
      totais.totais_por_status_comissao.pago.toFixed(2),
    );

    const resultado = orcamentos.toJSON();
    resultado.data = servicosFormatados;
    resultado.totais = totais;
    resultado.filtros = {
      data_inicio: filters.data_inicio || null,
      data_fim: filters.data_fim || null,
      prestador_id: filters.prestador_id || null,
      cliente_id: filters.cliente_id || null,
      status: filters.status || null,
      search: filters.search || null,
    };

    return resultado;
  }

  async updatePaymentStatus({ params, request, response }) {
    try {
      const { id } = params;
      const { tipo, status } = request.only(["tipo", "status"]);

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

      const campoStatus =
        tipo === "prestador"
          ? "status_pagamento_prestador"
          : "status_pagamento_comissao";

      parcela[campoStatus] = status;

      if (status === 2 && !parcela.data_pagamento) {
        parcela.data_pagamento = new Date().toISOString().split("T")[0];
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

  async show({ params, response }) {
    try {
      const { id } = params;

      const ServicoOrcamento = use("App/Models/OrcamentoServico");

      const servico = await ServicoOrcamento.query()
        .where("id", id)
        .with("parcelas", (builder) => {
          builder
            .select(
              "id",
              "orcamento_servico_id",
              "numero_parcela",
              "data_pagamento",
              "valor_parcela",
              "valor_prestador",
              "valor_comissao",
              "status_pagamento_prestador",
              "status_pagamento_comissao",
            )
            .orderBy("numero_parcela", "asc");
        })
        .with("servico", (builder) => {
          builder.select("id", "nome", "descricao");
        })
        .with("orcamentoPrestador", (builder) => {
          builder
            .select("id", "orcamento_id", "prestador_id")
            .with("orcamento", (orcamentoBuilder) => {
              orcamentoBuilder
                .select("id", "nome", "cliente_id", "created_at")
                .with("cliente", (clienteBuilder) => {
                  clienteBuilder.select("id", "nome", "email", "telefone");
                });
            })
            .with("prestador", (prestadorBuilder) => {
              prestadorBuilder.select("id", "nome", "email", "telefone");
            });
        })
        .first();

      if (!servico) {
        return response.status(404).json({
          success: false,
          message: "Serviço não encontrado",
        });
      }

      const servicoJSON = servico.toJSON();
      const orcamentoPrestador = servicoJSON.orcamentoPrestador;

      const servicoDetalhado = {
        id: servicoJSON.id,
        servico_id: servicoJSON.servico_id,
        servico_nome: servicoJSON.servico
          ? servicoJSON.servico.nome
          : "Não informado",
        servico_descricao: servicoJSON.servico
          ? servicoJSON.servico.descricao
          : null,
        orcamento_id: orcamentoPrestador.orcamento
          ? orcamentoPrestador.orcamento.id
          : null,
        orcamento_nome: orcamentoPrestador.orcamento
          ? orcamentoPrestador.orcamento.nome
          : "Não informado",
        cliente_id:
          orcamentoPrestador.orcamento && orcamentoPrestador.orcamento.cliente
            ? orcamentoPrestador.orcamento.cliente.id
            : null,
        cliente_nome:
          orcamentoPrestador.orcamento && orcamentoPrestador.orcamento.cliente
            ? orcamentoPrestador.orcamento.cliente.nome
            : "Não informado",
        cliente_email:
          orcamentoPrestador.orcamento && orcamentoPrestador.orcamento.cliente
            ? orcamentoPrestador.orcamento.cliente.email
            : null,
        cliente_telefone:
          orcamentoPrestador.orcamento && orcamentoPrestador.orcamento.cliente
            ? orcamentoPrestador.orcamento.cliente.telefone
            : null,
        prestador_id: orcamentoPrestador.prestador
          ? orcamentoPrestador.prestador.id
          : null,
        prestador_nome: orcamentoPrestador.prestador
          ? orcamentoPrestador.prestador.nome
          : "Não informado",
        prestador_email: orcamentoPrestador.prestador
          ? orcamentoPrestador.prestador.email
          : null,
        prestador_telefone: orcamentoPrestador.prestador
          ? orcamentoPrestador.prestador.telefone
          : null,
        tipo_pagamento: servicoJSON.tipo_pagamento,
        metodo_pagamento: servicoJSON.metodo_pagamento,
        numero_parcelas: servicoJSON.numero_parcelas,
        valor_total: parseFloat(servicoJSON.valor_total || 0).toFixed(2),
        valor_parcela: parseFloat(servicoJSON.valor_parcela || 0).toFixed(2),
        comissao: parseFloat(servicoJSON.comissao || 0).toFixed(2),
        valor_prestador: parseFloat(servicoJSON.valor_prestador || 0).toFixed(
          2,
        ),
        data_inicio: servicoJSON.data_inicio,
        data_entrega: servicoJSON.data_entrega,
        data_pagamento: servicoJSON.data_pagamento,
        parcelas: servicoJSON.parcelas
          ? servicoJSON.parcelas.map((parcela) => ({
              id: parcela.id,
              numero_parcela: parcela.numero_parcela,
              data_pagamento: parcela.data_pagamento,
              valor_parcela: parseFloat(parcela.valor_parcela || 0).toFixed(2),
              valor_prestador: parseFloat(parcela.valor_prestador || 0).toFixed(
                2,
              ),
              valor_comissao: parseFloat(parcela.valor_comissao || 0).toFixed(
                2,
              ),
              status_pagamento_prestador: parcela.status_pagamento_prestador,
              status_pagamento_comissao: parcela.status_pagamento_comissao,
              status_pagamento_prestador_texto:
                parcela.status_pagamento_prestador === 1 ? "Pendente" : "Pago",
              status_pagamento_comissao_texto:
                parcela.status_pagamento_comissao === 1 ? "Pendente" : "Pago",
            }))
          : [],
        total_prestador_pendente: servicoJSON.parcelas
          ? servicoJSON.parcelas
              .filter((p) => p.status_pagamento_prestador === 1)
              .reduce((sum, p) => sum + parseFloat(p.valor_prestador), 0)
              .toFixed(2)
          : "0.00",
        total_prestador_pago: servicoJSON.parcelas
          ? servicoJSON.parcelas
              .filter((p) => p.status_pagamento_prestador === 2)
              .reduce((sum, p) => sum + parseFloat(p.valor_prestador), 0)
              .toFixed(2)
          : "0.00",
        total_comissao_pendente: servicoJSON.parcelas
          ? servicoJSON.parcelas
              .filter((p) => p.status_pagamento_comissao === 1)
              .reduce((sum, p) => sum + parseFloat(p.valor_comissao), 0)
              .toFixed(2)
          : "0.00",
        total_comissao_pago: servicoJSON.parcelas
          ? servicoJSON.parcelas
              .filter((p) => p.status_pagamento_comissao === 2)
              .reduce((sum, p) => sum + parseFloat(p.valor_comissao), 0)
              .toFixed(2)
          : "0.00",
      };

      return response.json({
        success: true,
        data: servicoDetalhado,
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes do serviço:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar detalhes do serviço",
        error: error.message,
      });
    }
  }

  async updateParcelaCompleta({ params, request, response }) {
    try {
      const { id } = params;
      const {
        data_pagamento,
        status_pagamento_prestador,
        status_pagamento_comissao,
      } = request.only([
        "data_pagamento",
        "status_pagamento_prestador",
        "status_pagamento_comissao",
      ]);

      const parcela = await ParcelasServico.findOrFail(id);

      if (data_pagamento !== undefined) {
        parcela.data_pagamento = data_pagamento || null;
      }

      if (
        status_pagamento_prestador !== undefined &&
        [1, 2].includes(Number(status_pagamento_prestador))
      ) {
        parcela.status_pagamento_prestador = status_pagamento_prestador;
      }

      if (
        status_pagamento_comissao !== undefined &&
        [1, 2].includes(Number(status_pagamento_comissao))
      ) {
        parcela.status_pagamento_comissao = status_pagamento_comissao;
      }

      await parcela.save();

      return response.status(200).json({
        success: true,
        message: "Parcela atualizada com sucesso",
        data: parcela,
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao atualizar parcela",
        error: error.message,
      });
    }
  }

  async all({ request }) {
    const filters = request.get();

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
            "data_pagamento",
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
              "status_pagamento_prestador",
              "status_pagamento_comissao",
            );
          });
      });

    if (filters.orcamento_id) {
      query.where("orcamento_id", filters.orcamento_id);
    }

    if (filters.prestador_id) {
      query.where("prestador_id", filters.prestador_id);
    }

    if (filters.status) {
      const status = parseInt(filters.status);
      query.whereHas("servicos.parcelas", (builder) => {
        builder.where(function () {
          this.where("status_pagamento_prestador", status).orWhere(
            "status_pagamento_comissao",
            status,
          );
        });
      });
    }

    query.orderBy("created_at", "desc");

    return await query.fetch();
  }

  async listarTodasPendenciasVencidas({ request, response }) {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hojeStr = hoje.toISOString().split("T")[0];

      const ParcelasServico = use("App/Models/ParcelasServico");
      const OrcamentoServico = use("App/Models/OrcamentoServico");

      const parcelasPrestadorVencidas = await ParcelasServico.query()
        .where("status_pagamento_prestador", 1)
        .where("data_pagamento", "<", hojeStr)
        .whereNotNull("data_pagamento")
        .orderBy("data_pagamento", "asc")
        .fetch();

      const parcelasJSON = parcelasPrestadorVencidas.toJSON();
      const prestadoresFormatados = [];

      for (const parcela of parcelasJSON) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (opBuilder) => {
            opBuilder
              .with("orcamento", (orcBuilder) => {
                orcBuilder.with("cliente");
              })
              .with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const servicoJSON = orcamentoServico.toJSON();
          const orcamentoPrestador = servicoJSON.orcamentoPrestador;
          const servico = servicoJSON.servico;
          const orcamento = orcamentoPrestador?.orcamento;
          const cliente = orcamento?.cliente;
          const prestador = orcamentoPrestador?.prestador;

          const dataVencimento = new Date(parcela.data_pagamento);
          const diasVencidos = Math.floor(
            (hoje - dataVencimento) / (1000 * 60 * 60 * 24),
          );

          prestadoresFormatados.push({
            id: parcela.id,
            tipo: "prestador",
            titulo: servico?.nome || "Serviço",
            descricao: `Parcela ${parcela.numero_parcela} - ${servico?.nome || ""}`,
            cliente_nome: cliente?.nome || null,
            prestador_nome: prestador?.nome || null,
            prestador_id: prestador?.id || null,
            valor: parseFloat(parcela.valor_prestador || 0),
            data_vencimento: parcela.data_pagamento,
            dias_vencidos: diasVencidos,
            orcamento_nome: orcamento?.nome || null,
            servico_nome: servico?.nome || null,
            numero_parcela: parcela.numero_parcela,
            status: "pendente",
            origem: "prestador",
            pode_pagar: true,
          });
        }
      }

      const ContaPagarParcela = use("App/Models/ContaPagarParcela");

      const parcelasFixasVencidas = await ContaPagarParcela.query()
        .with("conta", (builder) => {
          builder
            .select("id", "nome", "categoria_id", "prestador_id")
            .with("categoria", (catBuilder) => {
              catBuilder.select("id", "nome");
            })
            .with("prestador", (prestBuilder) => {
              prestBuilder.select("id", "nome");
            });
        })
        .where("status", 1)
        .where("data_vencimento", "<", hojeStr)
        .orderBy("data_vencimento", "asc")
        .fetch();

      const contasFixasFormatadas = parcelasFixasVencidas
        .toJSON()
        .map((parcela) => ({
          id: parcela.id,
          tipo: "conta_fixa",
          titulo: parcela.conta?.nome || "Conta Fixa",
          descricao: parcela.descricao || parcela.conta?.nome || "",
          cliente_nome: null,
          prestador_nome: parcela.conta?.prestador?.nome || null,
          prestador_id: parcela.conta?.prestador?.id || null,
          valor: parseFloat(parcela.valor || 0),
          data_vencimento: parcela.data_vencimento,
          dias_vencidos: Math.floor(
            (hoje - new Date(parcela.data_vencimento)) / (1000 * 60 * 60 * 24),
          ),
          categoria: parcela.conta?.categoria?.nome || "Não categorizado",
          status: "pendente",
          origem: "conta_pagar_fixa",
          pode_pagar: true,
        }));

      const ContaPagar = use("App/Models/ContaPagar");

      const contasVariaveisVencidas = await ContaPagar.query()
        .select(
          "contas_pagar.id",
          "contas_pagar.nome",
          "contas_pagar.data_inicio as data_vencimento",
          "contas_pagar.valor_total as valor",
          "contas_pagar.categoria_id",
          "categorias.nome as categoria_nome",
          "prestadores.id as prestador_id",
          "prestadores.nome as prestador_nome",
        )
        .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id")
        .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id")
        .where("contas_pagar.custo_variavel", true)
        .where("contas_pagar.status_geral", 1)
        .where("contas_pagar.data_inicio", "<", hojeStr)
        .orderBy("contas_pagar.data_inicio", "asc")
        .fetch();

      const contasVariaveisFormatadas = contasVariaveisVencidas
        .toJSON()
        .map((conta) => ({
          id: conta.id,
          tipo: "conta_variavel",
          titulo: conta.nome,
          descricao: conta.nome,
          cliente_nome: null,
          prestador_nome: conta.prestador_nome,
          prestador_id: conta.prestador_id,
          valor: parseFloat(conta.valor || 0),
          data_vencimento: conta.data_vencimento,
          dias_vencidos: Math.floor(
            (hoje - new Date(conta.data_vencimento)) / (1000 * 60 * 60 * 24),
          ),
          categoria: conta.categoria_nome || "Não categorizado",
          status: "pendente",
          origem: "conta_pagar_variavel",
          pode_pagar: true,
        }));

      const todasPendencias = [
        ...prestadoresFormatados,
        ...contasFixasFormatadas,
        ...contasVariaveisFormatadas,
      ];

      todasPendencias.sort(
        (a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento),
      );

      const totalValorPrestadores = prestadoresFormatados.reduce(
        (acc, item) => acc + item.valor,
        0,
      );
      const totalValorContasFixas = contasFixasFormatadas.reduce(
        (acc, item) => acc + item.valor,
        0,
      );
      const totalValorContasVariaveis = contasVariaveisFormatadas.reduce(
        (acc, item) => acc + item.valor,
        0,
      );

      return response.json({
        success: true,
        data: {
          data_consulta: hojeStr,
          resumo: {
            quantidade_total: todasPendencias.length,
            valor_total: parseFloat(
              (
                totalValorPrestadores +
                totalValorContasFixas +
                totalValorContasVariaveis
              ).toFixed(2),
            ),
            por_origem: {
              prestadores: {
                quantidade: prestadoresFormatados.length,
                valor: parseFloat(totalValorPrestadores.toFixed(2)),
              },
              contas_fixas: {
                quantidade: contasFixasFormatadas.length,
                valor: parseFloat(totalValorContasFixas.toFixed(2)),
              },
              contas_variaveis: {
                quantidade: contasVariaveisFormatadas.length,
                valor: parseFloat(totalValorContasVariaveis.toFixed(2)),
              },
            },
          },
          pendencias: todasPendencias,
        },
      });
    } catch (error) {
      console.error("❌ Erro detalhado:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar pendências vencidas",
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async getComissoesVencidas({ request, response }) {
    try {
      const { data_referencia } = request.get();

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hojeStr = data_referencia || hoje.toISOString().split("T")[0];

      const ParcelasServico = use("App/Models/ParcelasServico");
      const OrcamentoServico = use("App/Models/OrcamentoServico");

      const parcelasComissao = await ParcelasServico.query()
        .where("status_pagamento_comissao", 1)
        .whereNotNull("data_pagamento")
        .orderBy("data_pagamento", "asc")
        .fetch();

      const parcelasJSON = parcelasComissao.toJSON();
      const comissoesFormatadas = [];

      for (const parcela of parcelasJSON) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (opBuilder) => {
            opBuilder
              .with("orcamento", (orcBuilder) => {
                orcBuilder.with("cliente");
              })
              .with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const servicoJSON = orcamentoServico.toJSON();
          const orcamentoPrestador = servicoJSON.orcamentoPrestador;
          const servico = servicoJSON.servico;
          const orcamento = orcamentoPrestador?.orcamento;
          const cliente = orcamento?.cliente;
          const prestador = orcamentoPrestador?.prestador;

          const dataVencimento = new Date(parcela.data_pagamento);
          const diasVencidos = Math.floor(
            (hoje - dataVencimento) / (1000 * 60 * 60 * 24),
          );

          comissoesFormatadas.push({
            id: parcela.id,
            parcela_numero: parcela.numero_parcela,

            valor_comissao: parseFloat(parcela.valor_comissao || 0).toFixed(2),
            valor_prestador: parseFloat(parcela.valor_prestador || 0).toFixed(
              2,
            ),
            valor_parcela: parseFloat(parcela.valor_parcela || 0).toFixed(2),

            data_vencimento: parcela.data_pagamento,
            dias_vencidos: diasVencidos > 0 ? diasVencidos : 0,

            status_pagamento: parcela.status_pagamento_comissao,
            status_texto: "Pendente",

            servico: {
              id: servico?.id || null,
              nome: servico?.nome || "Serviço não encontrado",
            },

            prestador: {
              id: prestador?.id || null,
              nome: prestador?.nome || "Prestador não encontrado",
            },

            orcamento: {
              id: orcamento?.id || null,
              nome: orcamento?.nome || "Orçamento não encontrado",
            },

            cliente: {
              id: cliente?.id || null,
              nome: cliente?.nome || "Cliente não encontrado",
            },

            pode_pagar: true,
            origem: "comissao_servico",
          });
        }
      }

      comissoesFormatadas.sort(
        (a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento),
      );

      const totalValorComissoes = comissoesFormatadas.reduce(
        (acc, item) => acc + parseFloat(item.valor_comissao || 0),
        0,
      );

      const comissoesPorPrestador = {};
      comissoesFormatadas.forEach((item) => {
        const prestadorId = item.prestador.id;
        if (!comissoesPorPrestador[prestadorId]) {
          comissoesPorPrestador[prestadorId] = {
            prestador_id: prestadorId,
            prestador_nome: item.prestador.nome,
            quantidade_parcelas: 0,
            valor_total: 0,
            parcelas: [],
          };
        }
        comissoesPorPrestador[prestadorId].quantidade_parcelas++;
        comissoesPorPrestador[prestadorId].valor_total += parseFloat(
          item.valor_comissao,
        );
        comissoesPorPrestador[prestadorId].parcelas.push(item);
      });

      const comissoesAgrupadas = Object.values(comissoesPorPrestador).map(
        (item) => ({
          ...item,
          valor_total: parseFloat(item.valor_total.toFixed(2)),
        }),
      );

      return response.json({
        success: true,
        data: {
          data_consulta: hojeStr,
          resumo: {
            quantidade_total: comissoesFormatadas.length,
            valor_total: parseFloat(totalValorComissoes.toFixed(2)),
            quantidade_prestadores: comissoesAgrupadas.length,
          },
          comissoes: comissoesFormatadas,
          comissoes_por_prestador: comissoesAgrupadas,
        },
      });
    } catch (error) {
      console.error("❌ Erro ao buscar comissões vencidas:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao buscar comissões vencidas",
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

module.exports = OrcamentoRelatorioController;
