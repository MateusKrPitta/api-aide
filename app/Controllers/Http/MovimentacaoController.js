"use strict";

const Movimentacao = use("App/Models/Movimentacao");

class MovimentacaoController {
  // Listar todas
  async index() {
    return await Movimentacao.query().with("categoria").fetch();
  }

  // Criar nova
  async store({ request }) {
    const data = request.only([
      "tipo",
      "assunto",
      "observacao",
      "categoria_id",
      "valor",
    ]);

    const movimentacao = await Movimentacao.create(data);

    return movimentacao;
  }

  // Mostrar uma única
  async show({ params }) {
    const movimentacao = await Movimentacao.findOrFail(params.id);
    await movimentacao.load("categoria");
    return movimentacao;
  }

  // Atualizar
  async update({ params, request }) {
    const movimentacao = await Movimentacao.findOrFail(params.id);

    const data = request.only([
      "tipo",
      "assunto",
      "observacao",
      "categoria_id",
      "valor",
    ]);

    movimentacao.merge(data);

    await movimentacao.save();

    return movimentacao;
  }

  // Deletar
  async destroy({ params, response }) {
    const movimentacao = await Movimentacao.findOrFail(params.id);

    await movimentacao.delete();

    return response.status(204).send();
  }
}

module.exports = MovimentacaoController;
