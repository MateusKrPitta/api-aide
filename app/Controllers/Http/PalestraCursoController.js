"use strict";

const PalestraCurso = use("App/Models/PalestraCurso");
const ParcelaPalestraCurso = use("App/Models/ParcelaPalestraCurso");

class PalestraCursoController {
  async index({ response }) {
    try {
      const cursos = await PalestraCurso.query()
        .with("tipoPalestra")
        .with("cliente")
        .with("parcelas", (builder) => {
          builder.orderBy("numero_parcela", "asc");
        })
        .fetch();

      return response.status(200).json({
        success: true,
        message: "Palestras/Cursos listados com sucesso.",
        data: cursos,
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erro ao listar palestras/cursos.",
        error: error.message,
      });
    }
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

      // Validações específicas para pagamento parcelado
      if (data.tipo_pagamento == 2) {
        // 2 = Parcelado
        if (!data.qtd_parcelas || data.qtd_parcelas < 2) {
          return response.status(400).json({
            success: false,
            message: "Para pagamento parcelado, informe 2 ou mais parcelas",
          });
        }

        if (!data.primeira_data_parcela) {
          data.primeira_data_parcela = data.data;
        }
      }

      // Cria o curso/palestra
      const curso = await PalestraCurso.create(data);

      // Lógica de parcelamento
      if (data.tipo_pagamento == 2) {
        // 2 = Parcelado
        const valorParcela = (data.valor / data.qtd_parcelas).toFixed(2);
        const primeiraData = new Date(data.primeira_data_parcela);

        // Cria todas as parcelas
        for (let i = 0; i < data.qtd_parcelas; i++) {
          const dataVencimento = new Date(primeiraData);
          dataVencimento.setMonth(primeiraData.getMonth() + i);

          await ParcelaPalestraCurso.create({
            palestra_curso_id: curso.id,
            numero_parcela: i + 1,
            valor: valorParcela,
            data_vencimento: dataVencimento,
            status_pagamento: 1, // 1 = Pago, ajuste conforme necessário
          });
        }
      } else {
        // Pagamento à vista (tipo_pagamento == 1)
        await ParcelaPalestraCurso.create({
          palestra_curso_id: curso.id,
          numero_parcela: 1,
          valor: data.valor,
          data_vencimento: data.data,
          status_pagamento: data.status_pagamento,
        });
      }

      // Retorna com todas as relações
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

      // Remove parcelas existentes e cria novas se necessário
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
