"use strict";

const Categoria = use("App/Models/Categoria");

class CategoriaController {
  async index({ response }) {
    try {
      const categorias = await Categoria.query().fetch();

      return response.status(200).json({
        status: "success",
        message: "Categorias listadas com sucesso",
        data: categorias,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao listar categorias ativas",
        debug: error.message,
      });
    }
  }

  async store({ request, response }) {
    try {
      const data = request.only(["nome"]);

      if (!data.nome) {
        return response.status(400).json({
          status: "error",
          message: "O campo 'nome' é obrigatório",
        });
      }

      const categoria = await Categoria.create(data);

      return response.status(201).json({
        status: "success",
        message: "Categoria criada com sucesso",
        data: categoria,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao criar categoria",
        debug: error.message,
      });
    }
  }

  async show({ params, response }) {
    try {
      const categoria = await Categoria.findOrFail(params.id);

      return response.status(200).json({
        status: "success",
        message: "Categoria encontrada",
        data: categoria,
      });
    } catch (error) {
      return response.status(404).json({
        status: "error",
        message: "Categoria não encontrada",
        debug: error.message,
      });
    }
  }
  async reativar({ params, response }) {
    try {
      const categoria = await Categoria.findOrFail(params.id);

      if (categoria.ativo) {
        return response.status(400).json({
          status: "error",
          message: "Categoria já está ativa",
        });
      }

      categoria.ativo = true;
      await categoria.save();

      return response.status(200).json({
        status: "success",
        message: "Categoria reativada com sucesso",
        data: categoria,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao reativar categoria",
        debug: error.message,
      });
    }
  }
  async update({ params, request, response }) {
    try {
      const categoria = await Categoria.findOrFail(params.id);
      const data = request.only(["nome"]);

      if (!data.nome) {
        return response.status(400).json({
          status: "error",
          message: "O campo 'nome' é obrigatório",
        });
      }

      categoria.merge(data);
      await categoria.save();

      return response.status(200).json({
        status: "success",
        message: "Categoria atualizada com sucesso",
        data: categoria,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao atualizar categoria",
        debug: error.message,
      });
    }
  }

  async destroy({ params, response }) {
    try {
      const categoria = await Categoria.findOrFail(params.id);

      if (!categoria.ativo) {
        return response.status(400).json({
          status: "error",
          message: "Categoria já está inativada",
        });
      }

      categoria.ativo = false;
      await categoria.save();

      return response.status(200).json({
        status: "success",
        message: "Categoria inativada com sucesso",
        data: categoria,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao inativar categoria",
        debug: error.message,
      });
    }
  }
}

module.exports = CategoriaController;
