"use strict";

const Movimentacao = use("App/Models/Movimentacao");
const ContaPagar = use("App/Models/ContaPagar");
const ContaPagarParcela = use("App/Models/ContaPagarParcela");
const ContaReceber = use("App/Models/ContaReceber");
const ContaReceberParcela = use("App/Models/ContaReceberParcela");
const ParcelasServico = use("App/Models/ParcelasServico");
const OrcamentoServico = use("App/Models/OrcamentoServico");
const PalestraCurso = use("App/Models/PalestraCurso");
const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");
const Database = use("Database");

class MovimentacaoController {
  async store({ request, response }) {
    try {
      const data = request.all();

      if (!data.tipo || !data.assunto || !data.categoria_id || !data.valor) {
        return response.status(400).json({
          error: "Campos obrigatórios: tipo, assunto, categoria_id, valor",
        });
      }

      const movimentacao = await Movimentacao.create({
        tipo: data.tipo,
        assunto: data.assunto,
        observacao: data.observacao || null,
        categoria_id: data.categoria_id,
        valor: data.valor,
        status: data.status || 1,
        data_vencimento: data.data_vencimento || null,
        data_pagamento: data.status === 2 ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return response.status(201).json({
        success: true,
        message: "Movimentação criada com sucesso",
        data: movimentacao,
      });
    } catch (error) {
      console.error("Erro ao criar movimentação:", error);
      return response.status(500).json({
        error: "Erro ao criar movimentação",
        message: error.message,
      });
    }
  }
  async index({ request }) {
    const {
      page = 1,
      perPage = 10,
      tipo,
      data_inicio,
      data_fim,
      status,
      categoria_id,
      origem,
    } = request.get();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split("T")[0];

    const pagamentosPrestadores = await this.buscarPagamentosPrestadores(
      data_inicio,
      data_fim,
      hojeStr,
      tipo,
    );

    const comissoesReceber = await this.buscarComissoesReceber(
      data_inicio,
      data_fim,
      hojeStr,
      tipo,
    );

    const parcelasPalestras = await this.buscarParcelasPalestras(
      data_inicio,
      data_fim,
      hojeStr,
      tipo,
    );

    let query = Database.from(function () {
      this.select(
        Database.raw("CAST(movimentacoes.id AS TEXT) as id"),
        Database.raw("CAST(movimentacoes.tipo AS TEXT) as tipo"),
        "movimentacoes.assunto as descricao",
        "movimentacoes.valor",
        "movimentacoes.created_at as data",
        "movimentacoes.categoria_id",
        "categorias.nome as categoria_nome",
        Database.raw("'movimentacao' as origem"),
        Database.raw("NULL as cliente_id"),
        Database.raw("NULL as cliente_nome"),
        Database.raw("NULL as prestador_id"),
        Database.raw("NULL as prestador_nome"),
        Database.raw("NULL as servico_nome"),
        Database.raw("NULL as orcamento_nome"),
        "movimentacoes.data_vencimento",
        Database.raw("true as is_pago"),
        "movimentacoes.status as status_original",
        "movimentacoes.data_pagamento",
      )
        .from("movimentacoes")
        .leftJoin("categorias", "movimentacoes.categoria_id", "categorias.id")
        .where("movimentacoes.status", 2)

        .unionAll(function () {
          this.select(
            Database.raw("CONCAT('conta_pagar_', contas_pagar.id) as id"),
            Database.raw("'saida' as tipo"),
            "contas_pagar.nome as descricao",
            "contas_pagar.valor_total as valor",
            "contas_pagar.data_inicio as data",
            "contas_pagar.categoria_id",
            "categorias.nome as categoria_nome",
            Database.raw("'conta_pagar_variavel' as origem"),
            Database.raw("NULL as cliente_id"),
            Database.raw("NULL as cliente_nome"),
            "contas_pagar.prestador_id",
            "prestadores.nome as prestador_nome",
            Database.raw("NULL as servico_nome"),
            Database.raw("NULL as orcamento_nome"),
            "contas_pagar.data_inicio as data_vencimento",
            Database.raw("true as is_pago"),
            Database.raw("NULL as status_original"),
            Database.raw("NULL as data_pagamento"),
          )
            .from("contas_pagar")
            .leftJoin(
              "categorias",
              "contas_pagar.categoria_id",
              "categorias.id",
            )
            .leftJoin(
              "prestadores",
              "contas_pagar.prestador_id",
              "prestadores.id",
            )
            .where("contas_pagar.custo_variavel", true)
            .where("contas_pagar.status_geral", 2);
        })

        .unionAll(function () {
          this.select(
            Database.raw(
              "CONCAT('conta_pagar_parcela_', contas_pagar_parcelas.id) as id",
            ),
            Database.raw("'saida' as tipo"),
            Database.raw(
              "CONCAT(contas_pagar.nome, ' - ', contas_pagar_parcelas.descricao) as descricao",
            ),
            "contas_pagar_parcelas.valor",
            "contas_pagar_parcelas.data_vencimento as data",
            "contas_pagar.categoria_id",
            "categorias.nome as categoria_nome",
            Database.raw("'conta_pagar_fixo' as origem"),
            Database.raw("NULL as cliente_id"),
            Database.raw("NULL as cliente_nome"),
            "contas_pagar.prestador_id",
            "prestadores.nome as prestador_nome",
            Database.raw("NULL as servico_nome"),
            Database.raw("NULL as orcamento_nome"),
            "contas_pagar_parcelas.data_vencimento as data_vencimento",
            Database.raw("true as is_pago"),
            Database.raw("NULL as status_original"),
            Database.raw("NULL as data_pagamento"),
          )
            .from("contas_pagar_parcelas")
            .leftJoin(
              "contas_pagar",
              "contas_pagar_parcelas.conta_pagar_id",
              "contas_pagar.id",
            )
            .leftJoin(
              "categorias",
              "contas_pagar.categoria_id",
              "categorias.id",
            )
            .leftJoin(
              "prestadores",
              "contas_pagar.prestador_id",
              "prestadores.id",
            )
            .where("contas_pagar.custo_fixo", true)
            .where("contas_pagar_parcelas.status", 2);
        })

        .unionAll(function () {
          this.select(
            Database.raw("CONCAT('conta_receber_', contas_receber.id) as id"),
            Database.raw("'entrada' as tipo"),
            "contas_receber.nome as descricao",
            "contas_receber.valor_total as valor",
            "contas_receber.data_inicio as data",
            "contas_receber.categoria_id",
            "categorias.nome as categoria_nome",
            Database.raw("'conta_receber_variavel' as origem"),
            Database.raw("NULL as cliente_id"),
            Database.raw("NULL as cliente_nome"),
            Database.raw("NULL as prestador_id"),
            Database.raw("NULL as prestador_nome"),
            Database.raw("NULL as servico_nome"),
            Database.raw("NULL as orcamento_nome"),
            "contas_receber.data_inicio as data_vencimento",
            Database.raw("true as is_pago"),
            Database.raw("NULL as status_original"),
            Database.raw("NULL as data_pagamento"),
          )
            .from("contas_receber")
            .leftJoin(
              "categorias",
              "contas_receber.categoria_id",
              "categorias.id",
            )
            .where("contas_receber.custo_variavel", true)
            .where("contas_receber.status", 2);
        })

        .unionAll(function () {
          this.select(
            Database.raw(
              "CONCAT('conta_receber_parcela_', contas_receber_parcelas.id) as id",
            ),
            Database.raw("'entrada' as tipo"),
            Database.raw(
              "CONCAT(contas_receber.nome, ' - ', contas_receber_parcelas.descricao) as descricao",
            ),
            "contas_receber_parcelas.valor",
            "contas_receber_parcelas.data_vencimento as data",
            "contas_receber.categoria_id",
            "categorias.nome as categoria_nome",
            Database.raw("'conta_receber_fixo' as origem"),
            Database.raw("NULL as cliente_id"),
            Database.raw("NULL as cliente_nome"),
            Database.raw("NULL as prestador_id"),
            Database.raw("NULL as prestador_nome"),
            Database.raw("NULL as servico_nome"),
            Database.raw("NULL as orcamento_nome"),
            "contas_receber_parcelas.data_vencimento as data_vencimento",
            Database.raw("true as is_pago"),
            Database.raw("NULL as status_original"),
            Database.raw("NULL as data_pagamento"),
          )
            .from("contas_receber_parcelas")
            .leftJoin(
              "contas_receber",
              "contas_receber_parcelas.conta_receber_id",
              "contas_receber.id",
            )
            .leftJoin(
              "categorias",
              "contas_receber.categoria_id",
              "categorias.id",
            )
            .where("contas_receber.custo_fixo", true)
            .where("contas_receber_parcelas.status_pagamento", 2);
        });
    }).as("all_movimentacoes");

    if (origem) {
      query.where("origem", origem);
    }

    if (tipo) {
      if (tipo === "entrada") {
        query.where("tipo", "entrada");
      } else if (tipo === "saida") {
        query.where("tipo", "saida");
      }
    }

    if (data_inicio && data_fim) {
      query.whereBetween("data", [data_inicio, data_fim]);
    } else if (data_inicio) {
      query.where("data", ">=", data_inicio);
    } else if (data_fim) {
      query.where("data", "<=", data_fim);
    }

    if (categoria_id) {
      query.where("categoria_id", categoria_id);
    }

    if (status === "pendente") {
      return {
        total: 0,
        perPage: parseInt(perPage),
        page: parseInt(page),
        lastPage: 0,
        data: [],
      };
    }

    const countResult = await query.clone().count("* as total");
    const totalQuery = parseInt(countResult[0].total);

    const dataPrincipal = await query
      .orderBy("data", "desc")
      .offset((page - 1) * perPage)
      .limit(perPage);

    let pagamentosFiltrados = pagamentosPrestadores;
    let comissoesFiltradas = comissoesReceber;
    let palestrasFiltradas = parcelasPalestras;

    if (tipo) {
      if (tipo === "entrada") {
        pagamentosFiltrados = [];
        comissoesFiltradas = comissoesFiltradas.filter(
          (item) => item.tipo === "entrada",
        );
        palestrasFiltradas = palestrasFiltradas.filter(
          (item) => item.tipo === "entrada",
        );
      } else if (tipo === "saida") {
        pagamentosFiltrados = pagamentosFiltrados.filter(
          (item) => item.tipo === "saida",
        );
        comissoesFiltradas = [];
        palestrasFiltradas = [];
      }
    }

    if (data_inicio || data_fim) {
      const filterByDate = (item) => {
        const itemDate = new Date(item.data);
        const start = data_inicio ? new Date(data_inicio) : null;
        const end = data_fim ? new Date(data_fim) : null;

        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
      };

      pagamentosFiltrados = pagamentosFiltrados.filter(filterByDate);
      comissoesFiltradas = comissoesFiltradas.filter(filterByDate);
      palestrasFiltradas = palestrasFiltradas.filter(filterByDate);
    }

    if (categoria_id) {
      const catId = parseInt(categoria_id);
      pagamentosFiltrados = pagamentosFiltrados.filter(
        (item) => item.categoria_id === catId,
      );
      comissoesFiltradas = comissoesFiltradas.filter(
        (item) => item.categoria_id === catId,
      );
      palestrasFiltradas = palestrasFiltradas.filter(
        (item) => item.categoria_id === catId,
      );
    }

    let todosDados = [
      ...dataPrincipal,
      ...pagamentosFiltrados,
      ...comissoesFiltradas,
      ...palestrasFiltradas,
    ];

    todosDados.sort((a, b) => new Date(b.data) - new Date(a.data));

    const startIndex = (page - 1) * perPage;
    const endIndex = page * perPage;
    const dadosPaginados = todosDados.slice(startIndex, endIndex);

    const formattedData = {
      total: totalQuery,
      perPage: parseInt(perPage),
      page: parseInt(page),
      lastPage: Math.ceil(totalQuery / perPage),
      data: dadosPaginados
        .filter((item) => item.is_pago === true)
        .map((item) => {
          return {
            id: item.id,
            tipo: item.tipo === "entrada" ? "Entrada" : "Saída",
            descricao: item.descricao,
            valor: parseFloat(item.valor),
            data: item.data,
            data_vencimento: item.data_vencimento || item.data,
            categoria_id: item.categoria_id,
            categoria_nome: item.categoria_nome || "Sem categoria",
            origem: item.origem,
            cliente_id: item.cliente_id,
            cliente_nome: item.cliente_nome,
            prestador_id: item.prestador_id,
            prestador_nome: item.prestador_nome,
            servico_nome: item.servico_nome,
            orcamento_nome: item.orcamento_nome,
            status: "pago",
            status_codigo: 3,
            status_texto: "Pago",
            dias_vencidos: 0,
            is_pago: true,
          };
        }),
    };
    return formattedData;
  }

  async buscarParcelasPalestras(data_inicio, data_fim, hojeStr, tipo = null) {
    try {
      const parcelas = await ParcelaPalestraCurso.query()
        .with("palestraCurso", (builder) => {
          builder.with("cliente").with("tipoPalestra");
        })
        .fetch();

      const resultados = [];

      for (const parcela of parcelas.rows) {
        const parcelaJson = parcela.toJSON();
        const palestra = parcelaJson.palestraCurso;

        if (tipo === "saida") {
          continue;
        }

        const dataVencimento = parcelaJson.data_vencimento;
        if (data_inicio && data_fim) {
          if (dataVencimento < data_inicio || dataVencimento > data_fim) {
            continue;
          }
        } else if (data_inicio && dataVencimento < data_inicio) {
          continue;
        } else if (data_fim && dataVencimento > data_fim) {
          continue;
        }

        const isPago = parcelaJson.status_pagamento === 1;

        resultados.push({
          id: `palestra_${parcelaJson.id}`,
          tipo: "entrada",
          descricao: `${palestra.nome || "Palestra/Curso"} - ${palestra.cliente?.nome || "Cliente não informado"} (Parcela ${parcelaJson.numero_parcela})`,
          valor: parseFloat(parcelaJson.valor || 0),
          data: parcelaJson.data_vencimento,
          data_vencimento: parcelaJson.data_vencimento,
          categoria_id: palestra.tipo_palestra_id,
          categoria_nome: palestra.tipoPalestra?.nome || "Palestra/Curso",
          origem: "palestra_curso",
          cliente_id: palestra.cliente_id,
          cliente_nome: palestra.cliente?.nome,
          prestador_id: null,
          prestador_nome: null,
          servico_nome: palestra.tipoPalestra?.nome,
          orcamento_nome: null,
          is_pago: isPago,
          status_pagamento: parcelaJson.status_pagamento,
        });
      }

      return resultados;
    } catch (error) {
      console.error("Erro ao buscar parcelas de palestras:", error);
      return [];
    }
  }
  async buscarPagamentosPrestadores(
    data_inicio,
    data_fim,
    hojeStr,
    tipo = null,
  ) {
    try {
      const parcelas = await ParcelasServico.query()
        .where("status_pagamento_prestador", 2)
        .fetch();

      const pagamentos = [];

      for (const parcela of parcelas.rows) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (builder) => {
            builder.with("orcamento").with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const os = orcamentoServico.toJSON();

          if (tipo === "entrada") {
            continue;
          }

          const dataPagamento = parcela.data_pagamento;
          if (data_inicio && data_fim) {
            if (dataPagamento < data_inicio || dataPagamento > data_fim)
              continue;
          } else if (data_inicio && dataPagamento < data_inicio) continue;
          else if (data_fim && dataPagamento > data_fim) continue;

          pagamentos.push({
            id: `prestador_${parcela.id}`,
            tipo: "saida",
            descricao: `Prestador: ${os.orcamentoPrestador?.prestador?.nome || "N/A"} - ${os.servico?.nome || "Serviço"} (Parcela ${parcela.numero_parcela})`,
            valor: parseFloat(parcela.valor_prestador || 0),
            data: parcela.data_pagamento,
            data_vencimento: parcela.data_pagamento,
            categoria_id: null,
            categoria_nome: "Pagamento Prestador",
            origem: "pagamento_prestador",
            cliente_id: null,
            cliente_nome: null,
            prestador_id: os.orcamentoPrestador?.prestador?.id,
            prestador_nome: os.orcamentoPrestador?.prestador?.nome,
            servico_nome: os.servico?.nome,
            orcamento_nome: os.orcamentoPrestador?.orcamento?.nome,
          });
        }
      }

      return pagamentos;
    } catch (error) {
      console.error("Erro ao buscar pagamentos de prestadores:", error);
      return [];
    }
  }

  async buscarComissoesReceber(data_inicio, data_fim, hojeStr, tipo = null) {
    try {
      const parcelas = await ParcelasServico.query()
        .where("status_pagamento_comissao", 2)
        .fetch();

      const comissoes = [];

      for (const parcela of parcelas.rows) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (builder) => {
            builder
              .with("orcamento", (orcBuilder) => {
                orcBuilder.with("cliente");
              })
              .with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const os = orcamentoServico.toJSON();

          if (tipo === "saida") {
            continue;
          }

          const dataPagamento = parcela.data_pagamento;

          if (data_inicio && data_fim) {
            if (dataPagamento < data_inicio || dataPagamento > data_fim) {
              continue;
            }
          } else if (data_inicio && dataPagamento < data_inicio) {
            continue;
          } else if (data_fim && dataPagamento > data_fim) {
            continue;
          }

          comissoes.push({
            id: `comissao_${parcela.id}`,
            tipo: "entrada",
            descricao: `Comissão: ${os.servico?.nome || "Serviço"} - Cliente: ${os.orcamentoPrestador?.orcamento?.cliente?.nome || "N/A"} (Parcela ${parcela.numero_parcela})`,
            valor: parseFloat(parcela.valor_comissao || 0),
            data: parcela.data_pagamento,
            data_vencimento: parcela.data_pagamento,
            categoria_id: null,
            categoria_nome: "Comissão a Receber",
            origem: "comissao_receber",
            cliente_id: os.orcamentoPrestador?.orcamento?.cliente?.id,
            cliente_nome: os.orcamentoPrestador?.orcamento?.cliente?.nome,
            prestador_id: os.orcamentoPrestador?.prestador?.id,
            prestador_nome: os.orcamentoPrestador?.prestador?.nome,
            servico_nome: os.servico?.nome,
            orcamento_nome: os.orcamentoPrestador?.orcamento?.nome,
          });
        }
      }

      return comissoes;
    } catch (error) {
      console.error("Erro ao buscar comissões a receber:", error);
      return [];
    }
  }
  async diagnosticarComissoes({ response }) {
    try {
      const todasParcelas = await Database.raw(`
      SELECT 
        ps.id,
        ps.numero_parcela,
        ps.valor_comissao,
        ps.status_pagamento_comissao,
        ps.data_pagamento,
        os.id as orcamento_servico_id,
        s.nome as servico_nome
      FROM parcelas_servicos ps
      LEFT JOIN orcamento_servicos os ON ps.orcamento_servico_id = os.id
      LEFT JOIN servicos s ON os.servico_id = s.id
    `);

      const parcelasPagas = await Database.raw(`
      SELECT 
        ps.id,
        ps.numero_parcela,
        ps.valor_comissao,
        ps.status_pagamento_comissao,
        ps.data_pagamento
      FROM parcelas_servicos ps
      WHERE ps.status_pagamento_comissao = 2
    `);

      const somaComissoes = await Database.raw(`
      SELECT SUM(valor_comissao) as total
      FROM parcelas_servicos
      WHERE status_pagamento_comissao = 2
    `);

      return response.json({
        success: true,
        data: {
          todas_parcelas: todasParcelas.rows,
          parcelas_pagas: parcelasPagas.rows,
          total_comissoes_pagas: somaComissoes.rows[0]?.total || 0,
        },
      });
    } catch (error) {
      console.error("Erro no diagnóstico:", error);
      return response.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  async getTotals({ request }) {
    const { data_inicio, data_fim, origem, categoria_id } = request.get();

    const [
      totalMovimentacoes,
      totalContasPagarVariaveis,
      totalParcelasPagarFixas,
      totalContasReceberVariaveis,
      totalParcelasReceberFixas,
      pagamentosPrestadores,
      comissoesReceber,
      parcelasPalestras,
    ] = await Promise.all([
      Database.from("movimentacoes")
        .select(
          Database.raw(
            "SUM(CASE WHEN tipo = 1 AND status = 2 THEN valor ELSE 0 END) as total_entradas_pagas",
          ),
          Database.raw(
            "SUM(CASE WHEN tipo = 2 AND status = 2 THEN valor ELSE 0 END) as total_saidas_pagas",
          ),
          Database.raw("COUNT(CASE WHEN status = 2 THEN 1 END) as total_pagas"),
        )
        .modify((query) => {
          if (data_inicio && data_fim) {
            query.whereBetween("created_at", [data_inicio, data_fim]);
          } else if (data_inicio) {
            query.where("created_at", ">=", data_inicio);
          } else if (data_fim) {
            query.where("created_at", "<=", data_fim);
          }

          if (categoria_id) {
            query.where("categoria_id", categoria_id);
          }
        })
        .first(),

      Database.from("contas_pagar")
        .select(
          Database.raw(
            "SUM(CASE WHEN status_geral = 2 THEN valor_total ELSE 0 END) as total_pago",
          ),
        )
        .where("custo_variavel", true)
        .modify((query) => {
          if (data_inicio && data_fim) {
            query.whereBetween("data_inicio", [data_inicio, data_fim]);
          } else if (data_inicio) {
            query.where("data_inicio", ">=", data_inicio);
          } else if (data_fim) {
            query.where("data_inicio", "<=", data_fim);
          }

          if (categoria_id) {
            query.where("categoria_id", categoria_id);
          }
        })
        .first(),

      Database.from("contas_pagar_parcelas")
        .select(
          Database.raw(
            "SUM(CASE WHEN contas_pagar_parcelas.status = 2 THEN contas_pagar_parcelas.valor ELSE 0 END) as total_pago",
          ),
        )
        .innerJoin(
          "contas_pagar",
          "contas_pagar_parcelas.conta_pagar_id",
          "contas_pagar.id",
        )
        .where("contas_pagar.custo_fixo", true)
        .modify((query) => {
          if (data_inicio && data_fim) {
            query.whereBetween("contas_pagar_parcelas.data_vencimento", [
              data_inicio,
              data_fim,
            ]);
          } else if (data_inicio) {
            query.where(
              "contas_pagar_parcelas.data_vencimento",
              ">=",
              data_inicio,
            );
          } else if (data_fim) {
            query.where(
              "contas_pagar_parcelas.data_vencimento",
              "<=",
              data_fim,
            );
          }

          if (categoria_id) {
            query.where("contas_pagar.categoria_id", categoria_id);
          }
        })
        .first(),

      Database.from("contas_receber")
        .select(
          Database.raw(
            "SUM(CASE WHEN status = 2 THEN valor_total ELSE 0 END) as total_pago",
          ),
        )
        .where("custo_variavel", true)
        .modify((query) => {
          if (data_inicio && data_fim) {
            query.whereBetween("data_inicio", [data_inicio, data_fim]);
          } else if (data_inicio) {
            query.where("data_inicio", ">=", data_inicio);
          } else if (data_fim) {
            query.where("data_inicio", "<=", data_fim);
          }

          if (categoria_id) {
            query.where("categoria_id", categoria_id);
          }
        })
        .first(),

      Database.from("contas_receber_parcelas")
        .select(
          Database.raw(
            "SUM(CASE WHEN contas_receber_parcelas.status_pagamento = 2 THEN contas_receber_parcelas.valor ELSE 0 END) as total_pago",
          ),
        )
        .innerJoin(
          "contas_receber",
          "contas_receber_parcelas.conta_receber_id",
          "contas_receber.id",
        )
        .where("contas_receber.custo_fixo", true)
        .modify((query) => {
          if (data_inicio && data_fim) {
            query.whereBetween("contas_receber_parcelas.data_vencimento", [
              data_inicio,
              data_fim,
            ]);
          } else if (data_inicio) {
            query.where(
              "contas_receber_parcelas.data_vencimento",
              ">=",
              data_inicio,
            );
          } else if (data_fim) {
            query.where(
              "contas_receber_parcelas.data_vencimento",
              "<=",
              data_fim,
            );
          }

          if (categoria_id) {
            query.where("contas_receber.categoria_id", categoria_id);
          }
        })
        .first(),

      this.getTotalPagamentosPrestadores(data_inicio, data_fim, categoria_id),

      this.getTotalComissoesReceber(data_inicio, data_fim, categoria_id),

      this.getTotalParcelasPalestras(data_inicio, data_fim, categoria_id),
    ]);

    const totalEntradasPagas =
      parseFloat(totalMovimentacoes?.total_entradas_pagas || 0) +
      parseFloat(totalContasReceberVariaveis?.total_pago || 0) +
      parseFloat(totalParcelasReceberFixas?.total_pago || 0) +
      parseFloat(comissoesReceber?.total_pago || 0) +
      parseFloat(parcelasPalestras?.total_pago || 0);

    const totalSaidasPagas =
      parseFloat(totalMovimentacoes?.total_saidas_pagas || 0) +
      parseFloat(totalContasPagarVariaveis?.total_pago || 0) +
      parseFloat(totalParcelasPagarFixas?.total_pago || 0) +
      parseFloat(pagamentosPrestadores?.total_pago || 0);

    const saldo = totalEntradasPagas - totalSaidasPagas;

    return {
      total_entradas: parseFloat(totalEntradasPagas.toFixed(2)),
      total_saidas: parseFloat(totalSaidasPagas.toFixed(2)),
      saldo: parseFloat(saldo.toFixed(2)),
      detalhes: {
        entradas: {
          pagas: parseFloat(totalEntradasPagas.toFixed(2)),
          movimentacoes: parseFloat(
            totalMovimentacoes?.total_entradas_pagas || 0,
          ),
          contas_receber_variaveis: parseFloat(
            totalContasReceberVariaveis?.total_pago || 0,
          ),
          contas_receber_fixas: parseFloat(
            totalParcelasReceberFixas?.total_pago || 0,
          ),
          comissoes: parseFloat(comissoesReceber?.total_pago || 0),
          palestras: parseFloat(parcelasPalestras?.total_pago || 0),
        },
        saidas: {
          pagas: parseFloat(totalSaidasPagas.toFixed(2)),
          movimentacoes: parseFloat(
            totalMovimentacoes?.total_saidas_pagas || 0,
          ),
          contas_pagar_variaveis: parseFloat(
            totalContasPagarVariaveis?.total_pago || 0,
          ),
          contas_pagar_fixas: parseFloat(
            totalParcelasPagarFixas?.total_pago || 0,
          ),
          pagamentos_prestadores: parseFloat(
            pagamentosPrestadores?.total_pago || 0,
          ),
        },
      },
      periodo: {
        data_inicio: data_inicio || null,
        data_fim: data_fim || null,
      },
    };
  }

  async getTotalPagamentosPrestadores(data_inicio, data_fim, categoria_id) {
    try {
      const query = Database.from("parcelas_servicos")
        .select(Database.raw("SUM(valor_prestador) as total_pago"))
        .where("status_pagamento_prestador", 2);

      if (data_inicio && data_fim) {
        query.whereBetween("data_pagamento", [data_inicio, data_fim]);
      } else if (data_inicio) {
        query.where("data_pagamento", ">=", data_inicio);
      } else if (data_fim) {
        query.where("data_pagamento", "<=", data_fim);
      }

      if (categoria_id) {
        query
          .innerJoin(
            "orcamento_servicos",
            "parcelas_servicos.orcamento_servico_id",
            "orcamento_servicos.id",
          )
          .innerJoin("servicos", "orcamento_servicos.servico_id", "servicos.id")
          .where("servicos.categoria_id", categoria_id);
      }

      const result = await query.first();
      return {
        total_pago: parseFloat(result?.total_pago || 0),
      };
    } catch (error) {
      console.error(
        "Erro ao calcular total de pagamentos a prestadores:",
        error,
      );
      return { total_pago: 0 };
    }
  }

  async getTotalComissoesReceber(data_inicio, data_fim, categoria_id) {
    try {
      let query = Database.from("parcelas_servicos")
        .select(Database.raw("SUM(valor_comissao) as total_pago"))
        .where("status_pagamento_comissao", 2);

      if (data_inicio && data_fim) {
        query.whereBetween("data_pagamento", [data_inicio, data_fim]);
      } else if (data_inicio) {
        query.where("data_pagamento", ">=", data_inicio);
      } else if (data_fim) {
        query.where("data_pagamento", "<=", data_fim);
      } else {
      }

      if (categoria_id) {
        query
          .innerJoin(
            "orcamento_servicos",
            "parcelas_servicos.orcamento_servico_id",
            "orcamento_servicos.id",
          )
          .innerJoin("servicos", "orcamento_servicos.servico_id", "servicos.id")
          .where("servicos.categoria_id", categoria_id);
      }

      const result = await query.first();

      const countQuery = await Database.from("parcelas_servicos")
        .count("* as total")
        .where("status_pagamento_comissao", 2);

      return {
        total_pago: parseFloat(result?.total_pago || 0),
      };
    } catch (error) {
      console.error("❌ Erro ao calcular total de comissões a receber:", error);
      return { total_pago: 0 };
    }
  }

  async getTotalParcelasPalestras(data_inicio, data_fim, categoria_id) {
    try {
      const testQuery = await Database.raw(`
      SELECT SUM(valor) as total_pago 
      FROM parcela_palestra_cursos 
      WHERE status_pagamento = 1
    `);

      const query = Database.from("parcela_palestra_cursos")
        .select(Database.raw("SUM(valor) as total_pago"))
        .where("status_pagamento", 1);

      if (data_inicio && data_fim) {
        query.whereBetween("data_vencimento", [data_inicio, data_fim]);
      } else if (data_inicio) {
        query.where("data_vencimento", ">=", data_inicio);
      } else if (data_fim) {
        query.where("data_vencimento", "<=", data_fim);
      }

      if (categoria_id) {
        query
          .innerJoin(
            "palestra_cursos",
            "parcela_palestra_cursos.palestra_curso_id",
            "palestra_cursos.id",
          )
          .where("palestra_cursos.tipo_palestra_id", categoria_id);
      }

      const result = await query.first();

      return {
        total_pago: parseFloat(result?.total_pago || 0),
      };
    } catch (error) {
      console.error("❌ ERRO CRÍTICO:", error);
      return { total_pago: 0 };
    }
  }
  async destroy({ params, response }) {
    const { id } = params;

    try {
      if (!isNaN(parseInt(id))) {
        const movimentacao = await Movimentacao.find(id);

        if (movimentacao) {
          await movimentacao.delete();
          return response.status(200).json({
            success: true,
            message: "Movimentação excluída com sucesso",
          });
        }
      }

      if (id.toString().startsWith("palestra_")) {
        const realId = id.toString().replace("palestra_", "");
        const parcela = await ParcelaPalestraCurso.find(realId);

        if (parcela) {
          const palestraId = parcela.palestra_curso_id;
          await parcela.delete();

          await this.atualizarStatusGeralPalestra(palestraId);

          return response.status(200).json({
            success: true,
            message: "Parcela de palestra excluída com sucesso",
            origem: "palestra_curso",
          });
        }
      }

      if (id.toString().startsWith("prestador_")) {
        const realId = id.toString().replace("prestador_", "");
        const parcela = await ParcelasServico.find(realId);

        if (parcela) {
          await parcela.delete();
          return response.status(200).json({
            success: true,
            message: "Pagamento a prestador excluído com sucesso",
            origem: "pagamento_prestador",
          });
        }
      }

      if (id.toString().startsWith("comissao_")) {
        const realId = id.toString().replace("comissao_", "");
        const parcela = await ParcelasServico.find(realId);

        if (parcela) {
          await parcela.delete();
          return response.status(200).json({
            success: true,
            message: "Comissão excluída com sucesso",
            origem: "comissao_receber",
          });
        }
      }

      if (
        id.toString().startsWith("conta_receber_") &&
        !id.toString().includes("parcela")
      ) {
        const realId = id.toString().replace("conta_receber_", "");

        await ContaReceberParcela.query()
          .where("conta_receber_id", realId)
          .delete();

        const conta = await ContaReceber.find(realId);
        if (conta) {
          await conta.delete();
          return response.status(200).json({
            success: true,
            message: "Conta a receber excluída com sucesso",
            origem: "conta_receber_variavel",
          });
        }
      }

      if (id.toString().startsWith("conta_receber_parcela_")) {
        const realId = id.toString().replace("conta_receber_parcela_", "");
        const parcela = await ContaReceberParcela.find(realId);

        if (parcela) {
          const contaId = parcela.conta_receber_id;
          await parcela.delete();

          await this.atualizarStatusContaReceberPrincipal(contaId);

          return response.status(200).json({
            success: true,
            message: "Parcela de conta a receber excluída com sucesso",
            origem: "conta_receber_fixo",
          });
        }
      }

      if (
        id.toString().startsWith("conta_pagar_") &&
        !id.toString().includes("parcela")
      ) {
        const realId = id.toString().replace("conta_pagar_", "");

        await ContaPagarParcela.query()
          .where("conta_pagar_id", realId)
          .delete();

        const conta = await ContaPagar.find(realId);
        if (conta) {
          await conta.delete();
          return response.status(200).json({
            success: true,
            message: "Conta a pagar excluída com sucesso",
            origem: "conta_pagar_variavel",
          });
        }
      }

      if (id.toString().startsWith("conta_pagar_parcela_")) {
        const realId = id.toString().replace("conta_pagar_parcela_", "");
        const parcela = await ContaPagarParcela.find(realId);

        if (parcela) {
          const contaId = parcela.conta_pagar_id;
          await parcela.delete();

          await this.atualizarStatusContaPagarPrincipal(contaId);

          return response.status(200).json({
            success: true,
            message: "Parcela de conta a pagar excluída com sucesso",
            origem: "conta_pagar_fixo",
          });
        }
      }

      return response.status(404).json({
        error: "Item não encontrado",
        id_recebido: id,
      });
    } catch (error) {
      console.error("Erro detalhado ao deletar:", error);
      return response.status(500).json({
        error: "Erro ao deletar item",
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async getTotalComissoesReceber(data_inicio, data_fim, categoria_id) {
    try {
      let query = Database.from("parcelas_servicos")
        .select(Database.raw("SUM(valor_comissao) as total_pago"))
        .where("status_pagamento_comissao", 2);

      if (data_inicio && data_fim) {
        query.where(function () {
          this.whereBetween("data_pagamento", [
            data_inicio,
            data_fim,
          ]).orWhereNull("data_pagamento");
        });
      } else if (data_inicio) {
        query.where(function () {
          this.where("data_pagamento", ">=", data_inicio).orWhereNull(
            "data_pagamento",
          );
        });
      } else if (data_fim) {
        query.where(function () {
          this.where("data_pagamento", "<=", data_fim).orWhereNull(
            "data_pagamento",
          );
        });
      } else {
        console.log(
          "Nenhum filtro de data aplicado - buscando TODAS as comissões pagas",
        );
      }

      if (categoria_id) {
        query
          .innerJoin(
            "orcamento_servicos",
            "parcelas_servicos.orcamento_servico_id",
            "orcamento_servicos.id",
          )
          .innerJoin("servicos", "orcamento_servicos.servico_id", "servicos.id")
          .where("servicos.categoria_id", categoria_id);
      }

      const result = await query.first();

      const countQuery = await Database.from("parcelas_servicos")
        .count("* as total")
        .where("status_pagamento_comissao", 2);

      const parcela106 = await Database.from("parcelas_servicos")
        .select("*")
        .where("id", 106)
        .first();

      return {
        total_pago: parseFloat(result?.total_pago || 0),
      };
    } catch (error) {
      console.error("❌ Erro ao calcular total de comissões a receber:", error);
      return { total_pago: 0 };
    }
  }

  async show({ params, response }) {
    const { id } = params;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const calcularStatus = (dataVencimento, isPago) => {
      if (isPago) return { status: "pago", codigo: 3, texto: "Pago", dias: 0 };

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = new Date(dataVencimento);
      vencimento.setHours(0, 0, 0, 0);

      if (vencimento < hoje) {
        const diffTime = hoje - vencimento;
        const diasVencidos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          status: "vencido",
          codigo: 4,
          texto: "Vencido",
          dias: diasVencidos,
        };
      }

      return { status: "pendente", codigo: 1, texto: "Pendente", dias: 0 };
    };

    if (id.toString().startsWith("palestra_")) {
      const parcelaId = id.toString().replace("palestra_", "");
      const parcela = await ParcelaPalestraCurso.query()
        .where("id", parcelaId)
        .with("palestraCurso", (builder) => {
          builder.with("cliente").with("tipoPalestra");
        })
        .first();

      if (parcela) {
        const p = parcela.toJSON();
        const palestra = p.palestraCurso;

        if (palestra) {
          const statusMap = {
            1: "Pago",
            2: "Pendente",
            3: "Cancelado",
          };

          const isPago = p.status_pagamento === 1;
          const status = calcularStatus(p.data_vencimento, isPago);

          return {
            id: `palestra_${p.id}`,
            tipo: "Entrada",
            descricao: `${palestra.nome} - ${palestra.cliente?.nome} (Parcela ${p.numero_parcela})`,
            valor: parseFloat(p.valor),
            data: p.data_vencimento,
            data_vencimento: p.data_vencimento,
            categoria_id: palestra.tipo_palestra_id,
            categoria_nome: palestra.tipoPalestra?.nome || "Palestra/Curso",
            origem: "palestra_curso",
            cliente_id: palestra.cliente_id,
            cliente_nome: palestra.cliente?.nome,
            prestador_id: null,
            prestador_nome: null,
            servico_nome: palestra.tipoPalestra?.nome,
            ...status,
            detalhes: {
              palestra_id: palestra.id,
              numero_parcela: p.numero_parcela,
              status_pagamento_original: p.status_pagamento,
              status_pagamento_texto:
                statusMap[p.status_pagamento] || "Não informado",
            },
          };
        }
      }
    }

    let movimentacao = await Movimentacao.query()
      .with("categoria")
      .where("id", id)
      .first();

    if (movimentacao) {
      const movJson = movimentacao.toJSON();
      const status = calcularStatus(movJson.created_at, true);
      return {
        id: movJson.id,
        tipo:
          movJson.tipo === 1
            ? "Entrada"
            : movJson.tipo === 2
              ? "Saída"
              : movJson.tipo,
        descricao: movJson.assunto,
        observacao: movJson.observacao,
        valor: parseFloat(movJson.valor),
        data: movJson.created_at,
        data_vencimento: movJson.created_at,
        categoria_id: movJson.categoria_id,
        categoria_nome: movJson.categoria?.nome || "Sem categoria",
        origem: "movimentacao",
        ...status,
      };
    }

    const contaVariavel = await ContaPagar.query()
      .select(
        "contas_pagar.id",
        Database.raw("'saida' as tipo"),
        "contas_pagar.nome as descricao",
        "contas_pagar.valor_total as valor",
        "contas_pagar.data_inicio as data",
        "contas_pagar.categoria_id",
        "categorias.nome as categoria_nome",
        Database.raw("'conta_pagar_variavel' as origem"),
        "contas_pagar.prestador_id",
        "prestadores.nome as prestador_nome",
        "contas_pagar.data_inicio as data_vencimento",
        "contas_pagar.status_geral",
      )
      .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id")
      .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id")
      .where("contas_pagar.id", id)
      .where("contas_pagar.custo_variavel", true)
      .first();

    if (contaVariavel) {
      const c = contaVariavel.toJSON();
      const isPago = c.status_geral === 2;
      const status = calcularStatus(c.data_vencimento, isPago);
      return {
        id: `conta_pagar_${c.id}`,
        tipo: "Saída",
        descricao: c.descricao,
        valor: parseFloat(c.valor),
        data: c.data,
        data_vencimento: c.data_vencimento,
        categoria_id: c.categoria_id,
        categoria_nome: c.categoria_nome || "Sem categoria",
        origem: c.origem,
        prestador_id: c.prestador_id,
        prestador_nome: c.prestador_nome,
        ...status,
      };
    }

    const parcelaPagarFixa = await ContaPagarParcela.query()
      .select(
        "contas_pagar_parcelas.id",
        Database.raw("'saida' as tipo"),
        Database.raw(
          "CONCAT(contas_pagar.nome, ' - ', contas_pagar_parcelas.descricao) as descricao",
        ),
        "contas_pagar_parcelas.valor",
        "contas_pagar_parcelas.data_vencimento as data",
        "contas_pagar.categoria_id",
        "categorias.nome as categoria_nome",
        Database.raw("'conta_pagar_fixo' as origem"),
        "contas_pagar.prestador_id",
        "prestadores.nome as prestador_nome",
        "contas_pagar_parcelas.data_vencimento",
        "contas_pagar_parcelas.status",
      )
      .leftJoin(
        "contas_pagar",
        "contas_pagar_parcelas.conta_pagar_id",
        "contas_pagar.id",
      )
      .leftJoin("categorias", "contas_pagar.categoria_id", "categorias.id")
      .leftJoin("prestadores", "contas_pagar.prestador_id", "prestadores.id")
      .where("contas_pagar_parcelas.id", id)
      .first();

    if (parcelaPagarFixa) {
      const p = parcelaPagarFixa.toJSON();
      const isPago = p.status === 2;
      const status = calcularStatus(p.data_vencimento, isPago);
      return {
        id: `conta_pagar_parcela_${p.id}`,
        tipo: "Saída",
        descricao: p.descricao,
        valor: parseFloat(p.valor),
        data: p.data,
        data_vencimento: p.data_vencimento,
        categoria_id: p.categoria_id,
        categoria_nome: p.categoria_nome || "Sem categoria",
        origem: p.origem,
        prestador_id: p.prestador_id,
        prestador_nome: p.prestador_nome,
        ...status,
      };
    }

    const contaReceberVariavel = await ContaReceber.query()
      .select(
        "contas_receber.id",
        Database.raw("'entrada' as tipo"),
        "contas_receber.nome as descricao",
        "contas_receber.valor_total as valor",
        "contas_receber.data_inicio as data",
        "contas_receber.categoria_id",
        "categorias.nome as categoria_nome",
        Database.raw("'conta_receber_variavel' as origem"),
        "contas_receber.data_inicio as data_vencimento",
        "contas_receber.status",
      )
      .leftJoin("categorias", "contas_receber.categoria_id", "categorias.id")
      .where("contas_receber.id", id)
      .where("contas_receber.custo_variavel", true)
      .first();

    if (contaReceberVariavel) {
      const c = contaReceberVariavel.toJSON();
      const isPago = c.status === 2;
      const status = calcularStatus(c.data_vencimento, isPago);
      return {
        id: `conta_receber_${c.id}`,
        tipo: "Entrada",
        descricao: c.descricao,
        valor: parseFloat(c.valor),
        data: c.data,
        data_vencimento: c.data_vencimento,
        categoria_id: c.categoria_id,
        categoria_nome: c.categoria_nome || "Sem categoria",
        origem: c.origem,
        ...status,
      };
    }

    const parcelaReceberFixa = await ContaReceberParcela.query()
      .select(
        "contas_receber_parcelas.id",
        Database.raw("'entrada' as tipo"),
        Database.raw(
          "CONCAT(contas_receber.nome, ' - ', contas_receber_parcelas.descricao) as descricao",
        ),
        "contas_receber_parcelas.valor",
        "contas_receber_parcelas.data_vencimento as data",
        "contas_receber.categoria_id",
        "categorias.nome as categoria_nome",
        Database.raw("'conta_receber_fixo' as origem"),
        "contas_receber_parcelas.data_vencimento",
        "contas_receber_parcelas.status_pagamento",
      )
      .leftJoin(
        "contas_receber",
        "contas_receber_parcelas.conta_receber_id",
        "contas_receber.id",
      )
      .leftJoin("categorias", "contas_receber.categoria_id", "categorias.id")
      .where("contas_receber_parcelas.id", id)
      .first();

    if (parcelaReceberFixa) {
      const p = parcelaReceberFixa.toJSON();
      const isPago = p.status_pagamento === 2;
      const status = calcularStatus(p.data_vencimento, isPago);

      const resultado = {
        id: `conta_receber_parcela_${p.id}`,
        tipo: "Entrada",
        descricao: p.descricao,
        valor: parseFloat(p.valor),
        data: p.data,
        data_vencimento: p.data_vencimento,
        categoria_id: p.categoria_id,
        categoria_nome: p.categoria_nome || "Sem categoria",
        origem: p.origem,
        ...status,
      };

      return resultado;
    }

    if (id.toString().startsWith("prestador_")) {
      const parcelaId = id.toString().replace("prestador_", "");
      const parcela = await ParcelasServico.find(parcelaId);

      if (parcela) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (builder) => {
            builder.with("orcamento").with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const os = orcamentoServico.toJSON();
          const isPago = parcela.status_pagamento_prestador === 2;
          const status = calcularStatus(parcela.data_pagamento, isPago);

          return {
            id: `prestador_${parcela.id}`,
            tipo: "Saída",
            descricao: `Prestador: ${os.orcamentoPrestador?.prestador?.nome} - ${os.servico?.nome} (Parcela ${parcela.numero_parcela})`,
            valor: parseFloat(parcela.valor_prestador),
            data: parcela.data_pagamento,
            data_vencimento: parcela.data_pagamento,
            categoria_id: null,
            categoria_nome: "Pagamento Prestador",
            origem: "pagamento_prestador",
            prestador_id: os.orcamentoPrestador?.prestador?.id,
            prestador_nome: os.orcamentoPrestador?.prestador?.nome,
            servico_nome: os.servico?.nome,
            orcamento_nome: os.orcamentoPrestador?.orcamento?.nome,
            ...status,
          };
        }
      }
    }

    if (id.toString().startsWith("comissao_")) {
      const parcelaId = id.toString().replace("comissao_", "");
      const parcela = await ParcelasServico.find(parcelaId);

      if (parcela) {
        const orcamentoServico = await OrcamentoServico.query()
          .where("id", parcela.orcamento_servico_id)
          .with("servico")
          .with("orcamentoPrestador", (builder) => {
            builder
              .with("orcamento", (orcBuilder) => {
                orcBuilder.with("cliente");
              })
              .with("prestador");
          })
          .first();

        if (orcamentoServico) {
          const os = orcamentoServico.toJSON();
          const isPago = parcela.status_pagamento_comissao === 2;
          const status = calcularStatus(parcela.data_pagamento, isPago);

          return {
            id: `comissao_${parcela.id}`,
            tipo: "Entrada",
            descricao: `Comissão: ${os.servico?.nome} - Cliente: ${os.orcamentoPrestador?.orcamento?.cliente?.nome} (Parcela ${parcela.numero_parcela})`,
            valor: parseFloat(parcela.valor_comissao),
            data: parcela.data_pagamento,
            data_vencimento: parcela.data_pagamento,
            categoria_id: null,
            categoria_nome: "Comissão a Receber",
            origem: "comissao_receber",
            cliente_id: os.orcamentoPrestador?.orcamento?.cliente?.id,
            cliente_nome: os.orcamentoPrestador?.orcamento?.cliente?.nome,
            prestador_id: os.orcamentoPrestador?.prestador?.id,
            prestador_nome: os.orcamentoPrestador?.prestador?.nome,
            servico_nome: os.servico?.nome,
            orcamento_nome: os.orcamentoPrestador?.orcamento?.nome,
            ...status,
          };
        }
      }
    }

    return response.status(404).json({
      error: "Movimentação não encontrada",
    });
  }

  async update({ params, request, response }) {
    const { id } = params;
    const data = request.all();

    try {
      let resultado;
      let model;

      if (id.toString().startsWith("palestra_")) {
        const realId = id.toString().replace("palestra_", "");

        model = await ParcelaPalestraCurso.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Parcela de palestra não encontrada",
            id_buscado: realId,
          });
        }

        const palestraUpdateData = {};

        if (data.valor !== undefined) {
          palestraUpdateData.valor = data.valor;
        }

        if (data.data_vencimento !== undefined) {
          palestraUpdateData.data_vencimento = data.data_vencimento;
        }

        let statusValue = data.status;
        if (data.status_geral !== undefined) {
          statusValue = data.status_geral;
        }

        if (statusValue !== undefined) {
          const statusNumerico = parseInt(statusValue, 10);
          updateData.status_geral = statusNumerico;

          if (statusNumerico === 2) {
            updateData.data_pagamento = new Date();
          }
        }

        model.merge(palestraUpdateData);
        await model.save();

        if (statusValue !== undefined) {
          await this.atualizarStatusGeralPalestra(model.palestra_curso_id);
        }

        const parcelaAtualizada = await ParcelaPalestraCurso.query()
          .where("id", realId)
          .with("palestraCurso", (builder) => {
            builder.with("cliente").with("tipoPalestra");
          })
          .first();

        return response.json({
          success: true,
          message: "Parcela de palestra atualizada com sucesso",
          data: parcelaAtualizada,
          origem: "palestra_curso",
        });
      }

      if (id.toString().startsWith("comissao_")) {
        const realId = id.toString().replace("comissao_", "");
        model = await ParcelasServico.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Comissão não encontrada",
          });
        }

        const updateData = {};

        if (data.valor_comissao !== undefined) {
          updateData.valor_comissao = data.valor_comissao;
        }

        if (data.data_pagamento !== undefined) {
          updateData.data_pagamento = data.data_pagamento;
        }

        if (data.status_pagamento_comissao !== undefined) {
          updateData.status_pagamento_comissao = parseInt(
            data.status_pagamento_comissao,
            10,
          );
        }

        model.merge(updateData);
        await model.save();

        return response.json({
          success: true,
          message: "Comissão atualizada com sucesso",
          data: model,
          origem: "comissao_receber",
        });
      }

      if (id.toString().startsWith("prestador_")) {
        const realId = id.toString().replace("prestador_", "");
        model = await ParcelasServico.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Pagamento a prestador não encontrado",
          });
        }

        const updateData = {};

        if (data.valor_prestador !== undefined) {
          updateData.valor_prestador = data.valor_prestador;
        }

        if (data.data_pagamento !== undefined) {
          updateData.data_pagamento = data.data_pagamento;
        }

        if (data.status_pagamento_prestador !== undefined) {
          updateData.status_pagamento_prestador = parseInt(
            data.status_pagamento_prestador,
            10,
          );
        }

        model.merge(updateData);
        await model.save();

        return response.json({
          success: true,
          message: "Pagamento a prestador atualizado com sucesso",
          data: model,
          origem: "pagamento_prestador",
        });
      }

      if (
        id.toString().startsWith("conta_receber_") &&
        !id.toString().includes("parcela")
      ) {
        const realId = id.toString().replace("conta_receber_", "");

        model = await ContaReceber.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Conta a receber não encontrada",
          });
        }

        const updateData = {};

        if (data.valor !== undefined) {
          updateData.valor_total = data.valor;
        }

        if (data.data_vencimento !== undefined) {
          updateData.data_inicio = data.data_vencimento;
        }

        if (data.status !== undefined) {
          updateData.status = parseInt(data.status, 10);
        }

        model.merge(updateData);
        await model.save();

        const parcela = await ContaReceberParcela.query()
          .where("conta_receber_id", realId)
          .first();

        if (parcela) {
          const parcelaUpdate = {};
          if (data.valor !== undefined) parcelaUpdate.valor = data.valor;
          if (data.data_vencimento !== undefined)
            parcelaUpdate.data_vencimento = data.data_vencimento;
          if (data.status !== undefined) {
            parcelaUpdate.status_pagamento = parseInt(data.status, 10);

            if (parseInt(data.status, 10) === 2) {
              parcelaUpdate.data_pagamento = new Date();
            }
          }

          parcela.merge(parcelaUpdate);
          await parcela.save();
        } else {
          console.log(
            "🔵 Nenhuma parcela única encontrada para a conta",
            realId,
          );
        }

        return response.json({
          success: true,
          message: "Conta a receber atualizada com sucesso",
          data: model,
          origem: "conta_receber_variavel",
        });
      }

      if (id.toString().startsWith("conta_receber_parcela_")) {
        const realId = id.toString().replace("conta_receber_parcela_", "");
        model = await ContaReceberParcela.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Parcela de conta a receber não encontrada",
          });
        }

        const updateData = {};

        if (data.valor !== undefined) {
          updateData.valor = data.valor;
        }

        if (data.data_vencimento !== undefined) {
          updateData.data_vencimento = data.data_vencimento;
        }

        if (data.status_pagamento !== undefined) {
          updateData.status_pagamento = parseInt(data.status_pagamento, 10);
          if (parseInt(data.status_pagamento, 10) === 2) {
            updateData.data_pagamento = new Date();
          }
        }

        model.merge(updateData);
        await model.save();

        await this.atualizarStatusContaReceberPrincipal(model.conta_receber_id);

        return response.json({
          success: true,
          message: "Parcela de conta a receber atualizada com sucesso",
          data: model,
          origem: "conta_receber_fixo",
        });
      }

      if (
        id.toString().startsWith("conta_pagar_") &&
        !id.toString().includes("parcela")
      ) {
        const realId = id.toString().replace("conta_pagar_", "");

        model = await ContaPagar.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Conta a pagar não encontrada",
          });
        }

        const updateData = {};

        if (data.valor !== undefined) {
          updateData.valor_total = data.valor;
        }

        if (data.data_vencimento !== undefined) {
          updateData.data_inicio = data.data_vencimento;
        }

        let statusValue = data.status;
        if (data.status_geral !== undefined) {
          statusValue = data.status_geral;
        }

        if (statusValue !== undefined) {
          const statusNumerico = parseInt(statusValue, 10);
          updateData.status_geral = statusNumerico;

          if (statusNumerico === 2) {
            updateData.data_pagamento = new Date();
          }
        }

        model.merge(updateData);
        await model.save();

        const contaAtualizada = await ContaPagar.find(realId);

        const parcela = await ContaPagarParcela.query()
          .where("conta_pagar_id", realId)
          .first();

        if (parcela) {
          const parcelaUpdate = {};
          if (data.valor !== undefined) parcelaUpdate.valor = data.valor;
          if (data.data_vencimento !== undefined)
            parcelaUpdate.data_vencimento = data.data_vencimento;

          if (statusValue !== undefined) {
            const statusNumerico = parseInt(statusValue, 10);
            parcelaUpdate.status = statusNumerico;

            if (statusNumerico === 2) {
              parcelaUpdate.data_pagamento = new Date();
            }
          }

          parcela.merge(parcelaUpdate);
          await parcela.save();

          const parcelaAtualizada = await ContaPagarParcela.find(parcela.id);
        } else {
          console.log(
            "🔴 Nenhuma parcela única encontrada para a conta",
            realId,
          );
        }

        return response.json({
          success: true,
          message: "Conta a pagar atualizada com sucesso",
          data: contaAtualizada,
          origem: "conta_pagar_variavel",
        });
      }

      if (id.toString().startsWith("conta_pagar_parcela_")) {
        const realId = id.toString().replace("conta_pagar_parcela_", "");

        model = await ContaPagarParcela.find(realId);

        if (!model) {
          return response.status(404).json({
            error: "Parcela de conta a pagar não encontrada",
          });
        }

        const updateData = {};

        if (data.valor !== undefined) {
          updateData.valor = data.valor;
        }

        if (data.data_vencimento !== undefined) {
          updateData.data_vencimento = data.data_vencimento;
        }

        if (data.status !== undefined) {
          updateData.status = parseInt(data.status, 10);
          if (parseInt(data.status, 10) === 2) {
            updateData.data_pagamento = new Date();
          }
        }

        model.merge(updateData);
        await model.save();

        await this.atualizarStatusContaPagarPrincipal(model.conta_pagar_id);

        return response.json({
          success: true,
          message: "Parcela de conta a pagar atualizada com sucesso",
          data: model,
          origem: "conta_pagar_fixo",
        });
      }

      if (!isNaN(parseInt(id))) {
        model = await Movimentacao.find(id);

        if (!model) {
          return response.status(404).json({
            error: "Movimentação não encontrada",
          });
        }

        const updateData = {};

        if (data.descricao !== undefined) updateData.assunto = data.descricao;
        if (data.assunto !== undefined) updateData.assunto = data.assunto;
        if (data.valor !== undefined) updateData.valor = data.valor;
        if (data.observacao !== undefined)
          updateData.observacao = data.observacao;
        if (data.categoria_id !== undefined)
          updateData.categoria_id = data.categoria_id;
        if (data.tipo !== undefined) updateData.tipo = data.tipo;
        if (data.data_vencimento !== undefined)
          updateData.data_vencimento = data.data_vencimento;

        if (data.status !== undefined) {
          const novoStatus = parseInt(data.status);
          updateData.status = novoStatus;

          if (novoStatus === 2) {
            updateData.data_pagamento = new Date();
          } else if (novoStatus !== 2 && model.data_pagamento) {
            updateData.data_pagamento = null;
          }
        }

        if (data.data_pagamento !== undefined) {
          updateData.data_pagamento = data.data_pagamento;
        }

        model.merge(updateData);
        await model.save();

        return response.json({
          success: true,
          message: "Movimentação atualizada com sucesso",
          data: model,
          origem: "movimentacao",
        });
      }

      return response.status(404).json({
        error: "Tipo de movimentação não reconhecido",
        id_recebido: id,
      });
    } catch (error) {
      console.error("Erro detalhado no update:", error);
      return response.status(500).json({
        error: "Erro ao atualizar",
        message: error.message,
        stack: error.stack,
      });
    }
  }
  async atualizarStatusGeralPalestra(palestraCursoId) {
    try {
      const parcelas = await ParcelaPalestraCurso.query()
        .where("palestra_curso_id", palestraCursoId)
        .fetch();

      if (parcelas.rows.length === 0) return;

      const todasPagas = parcelas.rows.every(
        (parcela) => parcela.status_pagamento === 1,
      );

      const algumaPendente = parcelas.rows.some(
        (parcela) => parcela.status_pagamento === 2,
      );

      const palestra = await PalestraCurso.find(palestraCursoId);

      if (palestra) {
        if (todasPagas) {
          palestra.status_pagamento = 1;
        } else if (algumaPendente) {
          palestra.status_pagamento = 2;
        }

        await palestra.save();
      }
    } catch (error) {
      console.error("Erro ao atualizar status geral da palestra:", error);
    }
  }

  identificarOrigemPorId(id) {
    if (id.toString().startsWith("palestra_")) return "palestra_curso";
    if (id.toString().startsWith("prestador_")) return "pagamento_prestador";
    if (id.toString().startsWith("comissao_")) return "comissao_receber";
    return null;
  }

  async descobrirOrigemPorId(id) {
    const parcelaPalestra = await ParcelaPalestraCurso.find(id);
    if (parcelaPalestra) {
      return "palestra_curso";
    }

    const contaReceberParcela = await ContaReceberParcela.find(id);
    if (contaReceberParcela) {
      return "conta_receber_fixo";
    }

    const contaPagarParcela = await ContaPagarParcela.find(id);
    if (contaPagarParcela) {
      return "conta_pagar_fixo";
    }

    const movimentacao = await Movimentacao.find(id);
    if (movimentacao) {
      return "movimentacao";
    }

    const contaReceber = await ContaReceber.find(id);
    if (contaReceber) {
      return "conta_receber_variavel";
    }

    const contaPagar = await ContaPagar.find(id);
    if (contaPagar) {
      return "conta_pagar_variavel";
    }

    const parcelaServico = await ParcelasServico.find(id);
    if (parcelaServico) {
      return "pagamento_prestador";
    }

    return null;
  }

  async atualizarStatusContaReceberPrincipal(contaId) {
    try {
      const parcelas = await ContaReceberParcela.query()
        .where("conta_receber_id", contaId)
        .fetch();

      parcelas.rows.forEach((p, index) => {
        console.log(`🟢 Parcela ${index + 1}:`, {
          id: p.id,
          status_pagamento: p.status_pagamento,
          data_vencimento: p.data_vencimento,
          valor: p.valor,
        });
      });

      const todasPagas = parcelas.rows.every((p) => p.status_pagamento === 2);

      const algumaPaga = parcelas.rows.some((p) => p.status_pagamento === 2);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const algumaVencida = parcelas.rows.some((p) => {
        if (p.status_pagamento === 2) return false;
        const vencimento = new Date(p.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        const vencida = vencimento < hoje;
        if (vencida) {
          console.log(`🟢 Parcela ${p.id} está vencida!`, {
            vencimento: vencimento.toISOString(),
            hoje: hoje.toISOString(),
          });
        }
        return vencida;
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

      const conta = await ContaReceber.find(contaId);

      if (conta && conta.status !== novoStatus) {
        conta.status = novoStatus;
        await conta.save();
      } else {
        console.log("🟢 Status da conta não precisa ser alterado");
      }
    } catch (error) {
      console.error("🟢 Erro ao atualizar status da conta principal:", error);
    }
  }

  async atualizarStatusContaPagarPrincipal(contaId) {
    try {
      const parcelas = await ContaPagarParcela.query()
        .where("conta_pagar_id", contaId)
        .fetch();

      if (parcelas.rows.length === 0) return;

      const todasPagas = parcelas.rows.every((p) => p.status === 2);
      const algumaPaga = parcelas.rows.some((p) => p.status === 2);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const algumaVencida = parcelas.rows.some((p) => {
        if (p.status === 2) return false;
        const vencimento = new Date(p.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento < hoje;
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

      const conta = await ContaPagar.find(contaId);
      if (conta && conta.status_geral !== novoStatus) {
        conta.status_geral = novoStatus;
        await conta.save();
      }
    } catch (error) {
      console.error("Erro ao atualizar status da conta principal:", error);
    }
  }
}

module.exports = MovimentacaoController;
