"use strict";

const TipoPalestra = use("App/Models/TipoPalestra");
const Database = use("Database");

class TipoPalestraController {
  async index({ response, request }) {
    try {
      // Verifica se foi passado o parâmetro 'ativos' na query string
      const { ativos } = request.get();

      let query = TipoPalestra.query();

      // Se o parâmetro ativos for 'true', filtra apenas os ativos
      if (ativos === "true") {
        query.where("ativo", true);
      }
      // Se for 'false', filtra apenas os inativos
      else if (ativos === "false") {
        query.where("ativo", false);
      }
      // Se não for passado, retorna todos (ativos e inativos)

      const tipos = await query.fetch();

      return response.status(200).json({
        success: true,
        data: tipos,
        message: "Tipos de palestra listados com sucesso",
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Falha ao listar tipos de palestra",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "TIPO_PALESTRA_INDEX_ERROR",
      });
    }
  }

  async store({ request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const data = request.only(["nome"]);

      if (!data.nome) {
        await trx.rollback();
        return response.status(422).json({
          success: false,
          message: "Nome é obrigatório",
          code: "VALIDATION_ERROR",
        });
      }

      const tipo = await TipoPalestra.create(data, trx);
      await trx.commit();

      return response.status(201).json({
        success: true,
        data: tipo,
        message: "Tipo de palestra criado com sucesso",
      });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({
        success: false,
        message: "Falha ao criar tipo de palestra",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "TIPO_PALESTRA_STORE_ERROR",
      });
    }
  }

  async inativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const tipo = await TipoPalestra.findOrFail(params.id);

      if (!tipo.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Tipo de palestra já está inativo",
          code: "ALREADY_INACTIVE",
        });
      }

      tipo.ativo = false;
      await tipo.save(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Tipo de palestra inativado com sucesso",
        data: tipo,
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao inativar tipo de palestra",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "INACTIVATION_ERROR",
      });
    }
  }

  async reativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const tipo = await TipoPalestra.findOrFail(params.id);

      if (tipo.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Tipo de palestra já está ativo",
          code: "ALREADY_ACTIVE",
        });
      }

      tipo.ativo = true;
      await tipo.save(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Tipo de palestra reativado com sucesso",
        data: tipo,
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao reativar tipo de palestra",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "REACTIVATION_ERROR",
      });
    }
  }

  async update({ params, request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const tipo = await TipoPalestra.findOrFail(params.id);
      const data = request.only(["nome"]);

      tipo.merge(data);
      await tipo.save(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        data: tipo,
        message: "Tipo de palestra atualizado com sucesso",
      });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({
        success: false,
        message: "Falha ao atualizar tipo de palestra",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "TIPO_PALESTRA_UPDATE_ERROR",
      });
    }
  }
}

module.exports = TipoPalestraController;
