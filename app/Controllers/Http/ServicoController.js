"use strict";

const Servico = use("App/Models/Servico");

class ServicoController {
  // Listar serviços ativos
  // Listar todos os serviços (ativos e inativos)
  async index({ response }) {
    try {
      const servicos = await Servico.query().with("categoria").fetch();

      return response.status(200).json({
        status: "success",
        message: "Todos os serviços listados com sucesso",
        data: servicos,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao listar serviços",
        debug: error.message,
      });
    }
  }

  // Criar novo serviço
  async store({ request, response }) {
    try {
      const data = request.only(["nome", "descricao", "categoria_id"]);

      if (!data.nome || !data.categoria_id) {
        return response.status(400).json({
          status: "error",
          message: "Os campos 'nome' e 'categoria_id' são obrigatórios",
        });
      }

      const servico = await Servico.create(data);

      return response.status(201).json({
        status: "success",
        message: "Serviço criado com sucesso",
        data: servico,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao criar serviço",
        debug: error.message,
      });
    }
  }

  // Mostrar serviço específico
  async show({ params, response }) {
    try {
      const servico = await Servico.query()
        .where("id", params.id)
        .with("categoria")
        .firstOrFail();

      return response.status(200).json({
        status: "success",
        message: "Serviço encontrado",
        data: servico,
      });
    } catch (error) {
      return response.status(404).json({
        status: "error",
        message: "Serviço não encontrado",
        debug: error.message,
      });
    }
  }

  async update({ params, request, response }) {
    try {
      const servico = await Servico.findOrFail(params.id);
      const data = request.only(["nome", "descricao", "categoria_id"]);

      // Validação adicional
      if (Object.keys(data).length === 0) {
        return response.status(400).json({
          status: "error",
          message: "Nenhum dado válido fornecido para atualização",
        });
      }

      servico.merge(data);
      await servico.save();

      return response.status(200).json({
        status: "success",
        message: "Serviço atualizado com sucesso",
        data: servico,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao atualizar serviço",
        debug: error.message,
      });
    }
  }

  // Inativar serviço
  async destroy({ params, response }) {
    try {
      const servico = await Servico.findOrFail(params.id);

      if (!servico.ativo) {
        return response.status(400).json({
          status: "error",
          message: "Serviço já está inativo",
        });
      }

      servico.ativo = false;
      await servico.save();

      return response.status(200).json({
        status: "success",
        message: "Serviço inativado com sucesso",
        data: servico,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao inativar serviço",
        debug: error.message,
      });
    }
  }

  // Reativar serviço
  async reativar({ params, response }) {
    try {
      const servico = await Servico.findOrFail(params.id);

      if (servico.ativo) {
        return response.status(400).json({
          status: "error",
          message: "Serviço já está ativo",
        });
      }

      servico.ativo = true;
      await servico.save();

      return response.status(200).json({
        status: "success",
        message: "Serviço reativado com sucesso",
        data: servico,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao reativar serviço",
        debug: error.message,
      });
    }
  }
}

module.exports = ServicoController;
