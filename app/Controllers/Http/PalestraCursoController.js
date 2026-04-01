"use strict";

const PalestraCurso = use("App/Models/PalestraCurso");
const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");

class PalestraCursoController {
  async index({ request, response }) {
    try {
      const { page = 1, perPage = 10, search = "" } = request.all();

      let query = PalestraCurso.query()
        .with("tipoPalestra")
        .with("cliente")
        .with("parcelas", (builder) => {
          builder.orderBy("numero_parcela", "asc");
        });

      if (search) {
        query = query.where(function () {
          this.where("nome", "like", `%${search}%`).orWhereHas(
            "cliente",
            (clienteBuilder) => {
              clienteBuilder.where("nome", "like", `%${search}%`);
            },
          );
        });
      }

      query = query.orderBy("data", "desc");

      const cursos = await query.paginate(page, perPage);

      return response.status(200).json({
        success: true,
        message: "Palestras/Cursos listados com sucesso.",
        data: cursos,
        pagination: {
          total: cursos.total,
          page: cursos.page,
          perPage: cursos.perPage,
          lastPage: cursos.lastPage,
        },
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao listar palestras/cursos.",
        error: error.message,
      });
    }
  }

  async indexSimplificado({ request, response }) {
    try {
      const { page = 1, perPage = 10, search = "" } = request.all();

      let query = PalestraCurso.query()
        .select("id", "nome", "data", "valor", "status_pagamento", "cliente_id")
        .with("cliente", (builder) => {
          builder.select("id", "nome as nome_cliente");
        });

      if (search) {
        query = query.where(function () {
          this.where("nome", "like", `%${search}%`).orWhereHas(
            "cliente",
            (clienteBuilder) => {
              clienteBuilder.where("nome", "like", `%${search}%`);
            },
          );
        });
      }

      query = query.orderBy("data", "desc");

      const cursos = await query.paginate(page, perPage);

      const dadosFormatados = cursos.data.map((curso) => {
        return {
          id: curso.id,
          nome: curso.nome || "Não informado",
          data: curso.data
            ? new Date(curso.data).toISOString().split("T")[0]
            : "",
          cliente: curso.cliente ? curso.cliente.nome_cliente : "Não informado",
          status_pagamento: this.formatarStatus(curso.status_pagamento),
          valor: parseFloat(curso.valor || 0),
        };
      });

      return response.status(200).json({
        success: true,
        message: "Palestras/Cursos listados com sucesso.",
        data: dadosFormatados,
        pagination: {
          total: cursos.total,
          page: cursos.page,
          perPage: cursos.perPage,
          lastPage: cursos.lastPage,
        },
      });
    } catch (error) {
      console.error("Erro no indexSimplificado:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao listar palestras/cursos.",
        error: error.message,
      });
    }
  }

  formatarStatus(status) {
    const statusMap = {
      1: "Pago",
      2: "Pendente",
      3: "Cancelado",
    };
    return statusMap[status] || "Não informado";
  }

  async store({ request, response }) {
    try {
      const data = request.only([
        "nome",
        "tipo_palestra_id",
        "cliente_id",
        "endereco",
        "data",
        "horario",
        "secoes",
        "valor",
        "status_pagamento",
        "tipo_pagamento",
        "forma_pagamento",
        "qtd_parcelas",
        "primeira_data_parcela",
      ]);

      const curso = await PalestraCurso.create(data);

      if (data.tipo_pagamento == 2) {
        const valorParcela = (data.valor / data.qtd_parcelas).toFixed(2);

        const primeiraData = data.primeira_data_parcela
          ? new Date(data.primeira_data_parcela)
          : new Date(data.data);

        for (let i = 0; i < data.qtd_parcelas; i++) {
          const dataVencimento = new Date(primeiraData);
          dataVencimento.setMonth(primeiraData.getMonth() + i);

          await ParcelaPalestraCurso.create({
            palestra_curso_id: curso.id,
            numero_parcela: i + 1,
            valor: valorParcela,
            data_vencimento: dataVencimento,
            status_pagamento: 2,
          });
        }
      } else {
        await ParcelaPalestraCurso.create({
          palestra_curso_id: curso.id,
          numero_parcela: 1,
          valor: data.valor,
          data_vencimento: data.data,
          status_pagamento: data.status_pagamento,
        });
      }

      const resultado = await PalestraCurso.query()
        .where("id", curso.id)
        .with("tipoPalestra")
        .with("cliente")
        .with("parcelas", (builder) => builder.orderBy("numero_parcela", "asc"))
        .first();

      return response.status(201).json({
        success: true,
        message: "Cadastrado com sucesso",
        data: resultado,
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({
        success: false,
        message: "Erro ao cadastrar",
        error: error.message,
      });
    }
  }

  async show({ params, response }) {
    try {
      const curso = await PalestraCurso.query()
        .where("id", params.id)
        .with("tipoPalestra")
        .with("cliente")
        .with("parcelas", (builder) => {
          builder.orderBy("numero_parcela", "asc");
        })
        .firstOrFail();

      return response.status(200).json({
        success: true,
        message: "Palestra/Curso encontrado com sucesso.",
        data: curso,
      });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: "Palestra/Curso não encontrado.",
        error: error.message,
      });
    }
  }

  async update({ params, request, response }) {
    try {
      const curso = await PalestraCurso.findOrFail(params.id);

      const data = request.only([
        "nome",
        "tipo_palestra_id",
        "cliente_id",
        "endereco",
        "data",
        "horario",
        "secoes",
        "valor",
        "status_pagamento",
        "tipo_pagamento",
        "forma_pagamento",
        "qtd_parcelas",
        "primeira_data_parcela",
      ]);

      curso.merge(data);
      await curso.save();

      await ParcelaPalestraCurso.query()
        .where("palestra_curso_id", curso.id)
        .delete();

      if (data.status_pagamento == 2 && data.qtd_parcelas > 1) {
        const valorParcela = (data.valor / data.qtd_parcelas).toFixed(2);
        const primeiraData = new Date(data.primeira_data_parcela);

        for (let i = 1; i <= data.qtd_parcelas; i++) {
          const dataVencimento = new Date(primeiraData);
          dataVencimento.setMonth(primeiraData.getMonth() + (i - 1));

          await ParcelaPalestraCurso.create({
            palestra_curso_id: curso.id,
            numero_parcela: i,
            valor: valorParcela,
            data_vencimento: dataVencimento,
            status_pagamento: i === 1 ? 1 : 2,
          });
        }
      } else {
        await ParcelaPalestraCurso.create({
          palestra_curso_id: curso.id,
          numero_parcela: 1,
          valor: data.valor,
          data_vencimento: data.primeira_data_parcela || data.data,
          status_pagamento: 1,
        });
      }

      return response.status(200).json({
        success: true,
        message: "Palestra/Curso atualizado com sucesso.",
        data: await PalestraCurso.query()
          .where("id", curso.id)
          .with("tipoPalestra")
          .with("cliente")
          .with("parcelas")
          .first(),
      });
    } catch (error) {
      console.error("Erro no update:", error);
      return response.status(500).json({
        success: false,
        message: "Erro ao atualizar palestra/curso.",
        error: error.message,
      });
    }
  }

  async destroy({ params, response }) {
    try {
      const curso = await PalestraCurso.findOrFail(params.id);
      await curso.delete();

      return response.status(200).json({
        success: true,
        message: "Palestra/Curso excluído com sucesso.",
      });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: "Palestra/Curso não encontrado para exclusão.",
        error: error.message,
      });
    }
  }
}

module.exports = PalestraCursoController;
