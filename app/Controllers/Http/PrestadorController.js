"use strict";

const Prestador = use("App/Models/Prestador");
const Database = use("Database");

class PrestadorController {
  async index({ response }) {
    try {
      const prestadores = await Prestador.query().with("servicos").fetch();

      return response.status(200).json({
        success: true,
        data: prestadores,
        message: "Prestadores listados com sucesso",
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Falha ao listar prestadores",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "PRESTADOR_INDEX_ERROR",
      });
    }
  }

  async store({ request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const data = request.only([
        "nome",
        "telefone",
        "cpf",
        "email",
        "estado",
        "cidade",
        "endereco",
        "numero",
        "complemento",
      ]);

      const servicosIds = request.input("servicos", []);

      // Validação básica (substitua por um validator se possível)
      if (!data.nome || !data.cpf || !data.email) {
        await trx.rollback();
        return response.status(422).json({
          success: false,
          message: "Dados incompletos",
          required_fields: ["nome", "cpf", "email"],
          code: "VALIDATION_ERROR",
        });
      }

      const prestador = await Prestador.create(data, trx);

      if (servicosIds.length > 0) {
        await prestador.servicos().attach(servicosIds, null, trx);
      }

      await trx.commit();

      return response.status(201).json({
        success: true,
        data: prestador,
        message: "Prestador criado com sucesso",
      });
    } catch (error) {
      await trx.rollback();

      // Tratamento específico para erros de duplicação
      if (error.code === "23505") {
        return response.status(409).json({
          success: false,
          message: "Dados já existentes",
          fields:
            error.detail
              ?.match(/\((.*?)\)/g)
              ?.map((f) => f.replace(/[()]/g, "")) || [],
          code: "DUPLICATE_ENTRY",
        });
      }

      return response.status(400).json({
        success: false,
        message: "Falha ao criar prestador",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "PRESTADOR_STORE_ERROR",
      });
    }
  }

  async show({ params, response }) {
    try {
      const prestador = await Prestador.query()
        .where("id", params.id)
        .with("servicos")
        .firstOrFail();

      return response.status(200).json({
        success: true,
        data: prestador,
        message: "Prestador encontrado",
      });
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: "Prestador não encontrado",
        code: "NOT_FOUND",
      });
    }
  }

  async update({ params, request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const prestador = await Prestador.findOrFail(params.id);
      const data = request.only([
        "nome",
        "telefone",
        "cpf",
        "email",
        "estado",
        "cidade",
        "endereco",
        "numero",
        "complemento",
      ]);

      // Remover formatação do CPF/CNPJ para evitar conflitos
      if (data.cpf) {
        data.cpf = data.cpf.replace(/\D/g, ""); // Remove tudo que não é número
      }

      const servicosIds = request.input("servicos", []);

      // Garantir que servicosIds seja um array
      const servicosArray = Array.isArray(servicosIds)
        ? servicosIds
        : [servicosIds].filter(Boolean);

      prestador.merge(data);
      await prestador.save(trx);

      if (servicosArray.length > 0) {
        await prestador.servicos().sync(servicosArray, null, trx);
      }

      await trx.commit();

      return response.status(200).json({
        success: true,
        data: prestador,
        message: "Prestador atualizado com sucesso",
      });
    } catch (error) {
      await trx.rollback();

      // Log mais detalhado do erro
      console.error("Erro ao atualizar prestador:", error);

      return response.status(400).json({
        success: false,
        message: "Falha ao atualizar prestador",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "UPDATE_ERROR",
        details:
          process.env.NODE_ENV === "development"
            ? {
                code: error.code,
                detail: error.detail,
                constraint: error.constraint,
              }
            : undefined,
      });
    }
  }

  async inativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const prestador = await Prestador.findOrFail(params.id);

      if (!prestador.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Prestador já está inativo",
          code: "ALREADY_INACTIVE",
        });
      }

      prestador.ativo = false;
      await prestador.save(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Prestador inativado com sucesso",
      });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({
        success: false,
        message: "Falha ao inativar prestador",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "INACTIVATION_ERROR",
      });
    }
  }

  async reativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const prestador = await Prestador.findOrFail(params.id);

      if (prestador.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Prestador já está ativo",
          code: "ALREADY_ACTIVE",
        });
      }

      prestador.ativo = true;
      await prestador.save(trx);
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Prestador reativado com sucesso",
        data: prestador,
      });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({
        success: false,
        message: "Falha ao reativar prestador",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "REACTIVATION_ERROR",
      });
    }
  }
}

module.exports = PrestadorController;
