"use strict";

const Orcamento = use("App/Models/Orcamento");
const OrcamentoPrestador = use("App/Models/OrcamentoPrestador");
const OrcamentoServico = use("App/Models/OrcamentoServico");
const Database = use("Database");
const Helpers = use("Helpers");
const ParcelasServico = use("App/Models/ParcelasServico");
const ContaReceber = use("App/Models/ContaReceber");
const ContaReceberParcela = use("App/Models/ContaReceberParcela");
const ContaPagar = use("App/Models/ContaPagar");
const ContaPagarParcela = use("App/Models/ContaPagarParcela");
const moment = require("moment");

class OrcamentoController {
  async index({ request, response }) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        data_inicio,
        data_fim,
        cliente_id,
        prestador_id,
        servico_id,
      } = request.all();

      let query = Orcamento.query()
        .with("cliente")
        .with("prestadores.prestador")
        .with("prestadores.servicos", (builder) => {
          builder.select("*").with("servico");
        })
        .with("arquivos")
        .orderBy("id", "desc");

      if (search) {
        query = query.where(function () {
          this.where("nome", "LIKE", `%${search}%`)
            .orWhereHas("cliente", (builder) => {
              builder.where("nome", "LIKE", `%${search}%`);
            })
            .orWhereHas("prestadores", (builder) => {
              builder.whereHas("prestador", (pBuilder) => {
                pBuilder.where("nome", "LIKE", `%${search}%`);
              }).orWhereHas("servicos", (sBuilder) => {
                sBuilder.whereHas("servico", (svBuilder) => {
                  svBuilder.where("nome", "LIKE", `%${search}%`);
                });
              });
            });
        });
      }

      // Filtro por Cliente
      if (cliente_id) {
        query.where("cliente_id", cliente_id);
      }

      // Filtro por Prestador
      if (prestador_id) {
        query.whereHas("prestadores", (builder) => {
          builder.where("prestador_id", prestador_id);
        });
      }

      // Filtro por Tipo de Serviço
      if (servico_id) {
        query.whereHas("prestadores.servicos", (builder) => {
          builder.where("servico_id", servico_id);
        });
      }

      // Filtro por Período
      if (data_inicio && data_fim) {
        query.whereHas("prestadores.servicos", (builder) => {
          builder.whereBetween("data_inicio", [data_inicio, data_fim]);
        });
      } else if (data_inicio) {
        query.whereHas("prestadores.servicos", (builder) => {
          builder.where("data_inicio", ">=", data_inicio);
        });
      } else if (data_fim) {
        query.whereHas("prestadores.servicos", (builder) => {
          builder.where("data_inicio", "<=", data_fim);
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
          const servicoModel = await use("App/Models/Servico").find(servico.servico_id);
          const servicoNome = servicoModel ? servicoModel.nome : "Serviço";

          const novoServico = await OrcamentoServico.create(
            {
              orcamento_prestador_id: orcamentoPrestador.id,
              servico_id: servico.servico_id,
              tipo_pagamento: servico.tipo_pagamento,
              metodo_pagamento: servico.metodo_pagamento,
              numero_parcelas: servico.numero_parcelas,
              valor_total: servico.valor_total,
              valor_parcela: servico.valor_parcela,
              comissao: (servico.is_servico_aide === true || servico.is_servico_aide === "true") ? servico.valor_total : servico.comissao,
              valor_prestador: (servico.is_servico_aide === true || servico.is_servico_aide === "true") ? 0 : servico.valor_prestador,
              is_servico_aide: (servico.is_servico_aide === true || servico.is_servico_aide === "true"),
              data_inicio: servico.data_inicio,
              data_entrega: servico.data_entrega,
              data_pagamento: servico.data_pagamento,
            },
            trx,
          );

          const totalParcelas = novoServico.numero_parcelas || 1;
          const valorTotal = parseFloat(novoServico.valor_total);
          const isAide = novoServico.is_servico_aide;

          const valorParcela = valorTotal / totalParcelas;
          const valorPrestadorParcela = isAide
            ? 0
            : parseFloat(novoServico.valor_prestador) / totalParcelas;
          const valorComissaoParcela = isAide
            ? valorTotal / totalParcelas
            : parseFloat(novoServico.comissao) / totalParcelas;

          // Criar Conta a Receber (Entrada Total do Cliente)
          const cliente = await orcamento.cliente().fetch();
          const contaReceber = await ContaReceber.create({
            nome: `Serviço: ${servicoNome} - Cliente: ${cliente.nome}`,
            custo_fixo: totalParcelas > 1,
            custo_variavel: totalParcelas === 1,
            categoria_id: servico.categoria_id || null,
            data_inicio: novoServico.data_inicio,
            valor_total: valorTotal,
            valor_mensal: totalParcelas > 1 ? valorParcela.toFixed(2) : valorTotal,
            status: 1, // Pendente
            forma_pagamento: novoServico.metodo_pagamento,
            orcamento_id: orcamento.id
          }, trx);

          // Criar Conta a Pagar (Saída para o Prestador) se não for Aidê
          let contaPagar = null;
          if (!isAide && novoServico.valor_prestador > 0) {
            const prestadorModel = await use("App/Models/Prestador").find(prestador.prestador_id);
            const prestadorNome = prestadorModel ? prestadorModel.nome : `ID: ${prestador.prestador_id}`;

            contaPagar = await ContaPagar.create({
              nome: `Pagamento Prestador: ${servicoNome} - Prestador: ${prestadorNome}`,
              custo_fixo: totalParcelas > 1,
              custo_variavel: totalParcelas === 1,
              prestador_id: prestador.prestador_id,
              data_inicio: novoServico.data_inicio,
              valor_total: parseFloat(novoServico.valor_prestador),
              status_geral: 1, // Pendente
              categoria_id: null,
              orcamento_id: orcamento.id
            }, trx);
          }

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimento = moment(novoServico.data_pagamento)
              .add(i, "months")
              .format("YYYY-MM-DD");

            await ParcelasServico.create(
              {
                orcamento_servico_id: novoServico.id,
                numero_parcela: i + 1,
                data_pagamento: dataVencimento,
                valor_parcela: valorParcela.toFixed(2),
                valor_prestador: valorPrestadorParcela.toFixed(2),
                valor_comissao: valorComissaoParcela.toFixed(2),
                status_pagamento_prestador: 1,
                status_pagamento_comissao: 1,
              },
              trx,
            );

            // Parcela de Conta a Receber
            await ContaReceberParcela.create({
              conta_receber_id: contaReceber.id,
              descricao: `Parcela ${i + 1}/${totalParcelas}`,
              data_vencimento: dataVencimento,
              valor: valorParcela.toFixed(2),
              status_pagamento: 1
            }, trx);

            // Parcela de Conta a Pagar
            if (contaPagar) {
              await ContaPagarParcela.create({
                conta_pagar_id: contaPagar.id,
                descricao: `Parcela ${i + 1}/${totalParcelas}`,
                data_vencimento: dataVencimento,
                valor: valorPrestadorParcela.toFixed(2),
                status: 1
              }, trx);
            }
          }
        }
      }

      await trx.commit();

      return response.status(201).json({
        success: true,
        message: "TESTE AIDE: Orçamento criado com sucesso!",
        data: await Orcamento.query()
          .where("id", orcamento.id)
          .with("cliente")
          .with("prestadores.prestador")
          .with("prestadores.servicos", (builder) => {
            builder.select("*").with("servico");
          })
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

      // Auto-correção: Sincronizar status das contas antes de verificar
      const idsReceber = await Database.from("contas_receber").where("orcamento_id", orcamento.id).pluck("id");
      const idsPagar = await Database.from("contas_pagar").where("orcamento_id", orcamento.id).pluck("id");

      const ContaReceberController = use("App/Controllers/Http/ContaReceberController");
      const ContaPagarController = use("App/Controllers/Http/ContaPagarController");
      const crCtrl = new ContaReceberController();
      const cpCtrl = new ContaPagarController();

      for (const id of idsReceber) {
        await crCtrl.atualizarStatusConta(id, trx);
      }
      for (const id of idsPagar) {
        await cpCtrl.atualizarStatusConta(id, trx);
      }

      // Verificar se existem parcelas pagas no Contas a Receber
      const temRecebimentoPago = await ContaReceber.query()
        .where("orcamento_id", orcamento.id)
        .whereHas("parcelas", (builder) => {
          builder.where("status_pagamento", 2); // 2 = Pago
        })
        .first();

      // Verificar se existem parcelas pagas no Contas a Pagar
      const temPagamentoPago = await ContaPagar.query()
        .where("orcamento_id", orcamento.id)
        .whereHas("parcelas", (builder) => {
          builder.where("status", 2); // 2 = Pago
        })
        .first();

      // Diagnóstico detalhado para o usuário
      if (temRecebimentoPago) {
        // Buscar a parcela específica que está paga para informar o ID
        const parcelaPaga = await temRecebimentoPago.parcelas().where("status_pagamento", 2).first();
        return response.status(400).json({
          success: false,
          message: `Não é possível excluir este orçamento pois existe uma parcela (ID ${parcelaPaga?.id}) já PAGA no Contas a Receber. Conta: "${temRecebimentoPago.nome}" (ID da Conta: ${temRecebimentoPago.id}). Por favor, estorne o recebimento desta conta primeiro.`,
        });
      }

      if (temPagamentoPago) {
        // Buscar a parcela específica que está paga para informar o ID
        const parcelaPaga = await temPagamentoPago.parcelas().where("status", 2).first();
        return response.status(400).json({
          success: false,
          message: `Não é possível excluir este orçamento pois existe um pagamento (ID ${parcelaPaga?.id}) já EFETUADO no Contas a Pagar. Conta: "${temPagamentoPago.nome}" (ID da Conta: ${temPagamentoPago.id}). Por favor, estorne este pagamento primeiro.`,
        });
      }

      // Segurança extra: verificar se há ParcelasServico marcadas como pagas (comissões/prestadores)
      const ParcelasServico = use("App/Models/ParcelasServico");
      const temServicoPago = await ParcelasServico.query()
        .whereHas("orcamentoServico.orcamentoPrestador", (builder) => {
          builder.where("orcamento_id", orcamento.id);
        })
        .where(function () {
          this.where("status_pagamento_prestador", 2).orWhere(
            "status_pagamento_comissao",
            2,
          );
        })
        .first();

      if (temServicoPago) {
        return response.status(400).json({
          success: false,
          message: `Não é possível excluir este orçamento pois existem comissões ou pagamentos de prestadores já marcados como PAGOS para este serviço. Por favor, estorne-os no Relatório de Serviços primeiro.`,
        });
      }

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

      // Excluir registros financeiros vinculados de forma explícita
      // Nota: Embora haja CASCADE na DB, a exclusão explícita garante que não haverá resíduos se o CASCADE falhar
      const idsContasReceber = (await Database.from("contas_receber").where("orcamento_id", orcamento.id).pluck("id")) || [];
      const idsContasPagar = (await Database.from("contas_pagar").where("orcamento_id", orcamento.id).pluck("id")) || [];

      if (idsContasReceber.length > 0) {
        await Database.from("contas_receber_parcelas").whereIn("conta_receber_id", idsContasReceber).delete().transacting(trx);
        await Database.from("contas_receber").whereIn("id", idsContasReceber).delete().transacting(trx);
      }

      if (idsContasPagar.length > 0) {
        await Database.from("contas_pagar_parcelas").whereIn("conta_pagar_id", idsContasPagar).delete().transacting(trx);
        await Database.from("contas_pagar").whereIn("id", idsContasPagar).delete().transacting(trx);
      }

      await orcamento.delete(trx);

      await trx.commit();

      return response.json({
        success: true,
        message: "Serviço excluído com sucesso!",
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
        // Verificar se existem parcelas pagas antes de permitir a alteração dos serviços
        const temRecebimentoPago = await ContaReceber.query()
          .where("orcamento_id", orcamento.id)
          .whereHas("parcelas", (builder) => {
            builder.where("status_pagamento", 2);
          })
          .first();

        const temPagamentoPago = await ContaPagar.query()
          .where("orcamento_id", orcamento.id)
          .whereHas("parcelas", (builder) => {
            builder.where("status", 2);
          })
          .first();

        if (temRecebimentoPago || temPagamentoPago) {
          return response.status(400).json({
            success: false,
            message:
              "Não é possível alterar os serviços deste orçamento pois existem parcelas já pagas. Por favor, estorne os pagamentos para habilitar a edição.",
          });
        }

        // Limpar financeiro pendente antigo para reconstruir com os novos dados
        await ContaReceber.query()
          .where("orcamento_id", orcamento.id)
          .where("status", 1) // Apenas se estiver pendente (segurança extra)
          .delete(trx);

        await ContaPagar.query()
          .where("orcamento_id", orcamento.id)
          .where("status_geral", 1) // Apenas se estiver pendente
          .delete(trx);

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
                  comissao: servico.is_servico_aide ? servico.valor_total : servico.comissao,
                  valor_prestador: servico.is_servico_aide ? 0 : servico.valor_prestador,
                  is_servico_aide: servico.is_servico_aide || false,
                  data_inicio: servico.data_inicio,
                  data_entrega: servico.data_entrega,
                  data_pagamento: servico.data_pagamento,
                },
                trx,
              );

              const totalParcelas = novoServico.numero_parcelas || 1;
              const valorTotal = parseFloat(novoServico.valor_total);
              const isAide = novoServico.is_servico_aide;

              const valorParcela = valorTotal / totalParcelas;
              const valorPrestadorParcela = isAide
                ? 0
                : parseFloat(novoServico.valor_prestador) / totalParcelas;
              const valorComissaoParcela = isAide
                ? valorTotal / totalParcelas
                : parseFloat(novoServico.comissao) / totalParcelas;

              const servicoModel = await use("App/Models/Servico").find(servico.servico_id);
              const servicoNome = servicoModel ? servicoModel.nome : "Serviço";
              const cliente = await orcamento.cliente().fetch();

              // Criar Conta a Receber (Entrada Total do Cliente)
              const contaReceber = await ContaReceber.create({
                nome: `Serviço: ${servicoNome} - Cliente: ${cliente.nome}`,
                custo_fixo: totalParcelas > 1,
                custo_variavel: totalParcelas === 1,
                categoria_id: servico.categoria_id || null,
                data_inicio: novoServico.data_inicio,
                valor_total: valorTotal,
                valor_mensal: totalParcelas > 1 ? valorParcela.toFixed(2) : valorTotal,
                status: 1, // Pendente
                forma_pagamento: novoServico.metodo_pagamento,
                orcamento_id: orcamento.id
              }, trx);

              // Criar Conta a Pagar (Saída para o Prestador) se não for Aidê
              let contaPagar = null;
              if (!isAide && novoServico.valor_prestador > 0) {
                const prestadorModel = await use("App/Models/Prestador").find(prestador.prestador_id);
                const prestadorNome = prestadorModel ? prestadorModel.nome : `ID: ${prestador.prestador_id}`;

                contaPagar = await ContaPagar.create({
                  nome: `Pagamento Prestador: ${servicoNome} - Prestador: ${prestadorNome}`,
                  custo_fixo: totalParcelas > 1,
                  custo_variavel: totalParcelas === 1,
                  prestador_id: prestador.prestador_id,
                  data_inicio: novoServico.data_inicio,
                  valor_total: parseFloat(novoServico.valor_prestador),
                  status_geral: 1, // Pendente
                  categoria_id: null,
                  orcamento_id: orcamento.id
                }, trx);
              }

              for (let i = 0; i < totalParcelas; i++) {
                const dataVencimento = moment(novoServico.data_pagamento)
                  .add(i, "months")
                  .format("YYYY-MM-DD");

                await ParcelasServico.create(
                  {
                    orcamento_servico_id: novoServico.id,
                    numero_parcela: i + 1,
                    data_pagamento: dataVencimento,
                    valor_parcela: valorParcela.toFixed(2),
                    valor_prestador: valorPrestadorParcela.toFixed(2),
                    valor_comissao: valorComissaoParcela.toFixed(2),
                    status_pagamento_prestador: 1,
                    status_pagamento_comissao: 1,
                  },
                  trx,
                );

                // Parcela de Conta a Receber
                await ContaReceberParcela.create({
                  conta_receber_id: contaReceber.id,
                  descricao: `Parcela ${i + 1}/${totalParcelas}`,
                  data_vencimento: dataVencimento,
                  valor: valorParcela.toFixed(2),
                  status_pagamento: 1
                }, trx);

                // Parcela de Conta a Pagar
                if (contaPagar) {
                  await ContaPagarParcela.create({
                    conta_pagar_id: contaPagar.id,
                    descricao: `Parcela ${i + 1}/${totalParcelas}`,
                    data_vencimento: dataVencimento,
                    valor: valorPrestadorParcela.toFixed(2),
                    status: 1
                  }, trx);
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
          .with("prestadores.servicos", (builder) => {
            builder.select("*").with("servico").with("parcelas");
          })
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
  async limparFinanceiro({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const orcamento = await Orcamento.findOrFail(params.id);

      // 1. Resetar Contas a Receber
      const idsReceber = await Database.from("contas_receber").where("orcamento_id", orcamento.id).pluck("id");
      if (idsReceber.length > 0) {
        await Database.from("contas_receber_parcelas").whereIn("conta_receber_id", idsReceber).update({ status_pagamento: 1, data_pagamento: null }).transacting(trx);
        await Database.from("contas_receber").whereIn("id", idsReceber).update({ status: 1 }).transacting(trx);
      }

      // 2. Resetar Contas a Pagar
      const idsPagar = await Database.from("contas_pagar").where("orcamento_id", orcamento.id).pluck("id");
      if (idsPagar.length > 0) {
        await Database.from("contas_pagar_parcelas").whereIn("conta_pagar_id", idsPagar).update({ status: 1, data_pagamento: null }).transacting(trx);
        await Database.from("contas_pagar").whereIn("id", idsPagar).update({ status_geral: 1 }).transacting(trx);
      }

      // 3. Resetar ParcelasServico (Relatório)
      await Database.from("parcelas_servicos")
        .whereIn("orcamento_servico_id", function() {
          this.from("orcamento_servicos")
            .whereIn("orcamento_prestador_id", function() {
              this.from("orcamentos_prestadores").where("orcamento_id", orcamento.id).select("id");
            })
            .select("id");
        })
        .update({ status_pagamento_prestador: 1, status_pagamento_comissao: 1, data_pagamento: null })
        .transacting(trx);

      await trx.commit();

      return response.json({
        success: true,
        message: "Financeiro resetado com sucesso! Agora você já pode excluir o orçamento.",
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao limpar financeiro.",
        error: error.message,
      });
    }
  }
}

module.exports = OrcamentoController;
