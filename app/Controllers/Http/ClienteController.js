"use strict";

const Cliente = use("App/Models/Cliente");
const Database = use("Database");

class ClienteController {
  async index({ response }) {
    try {
      const clientes = await Cliente.query().fetch();

      return response.status(200).json({
        success: true,
        data: clientes,
        message: "Clientes listados com sucesso",
      });
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Falha ao listar clientes",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "CLIENTE_INDEX_ERROR",
      });
    }
  }

  async store({ request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const data = request.only([
        "nome",
        "telefone",
        "cpf_cnpj",
        "email",
        "estado",
        "cidade",
        "endereco",
        "numero",
        "complemento",
        "responsavel",
      ]);

      if (!data.nome || !data.cpf_cnpj || !data.email) {
        await trx.rollback();
        return response.status(422).json({
          success: false,
          message: "Dados incompletos",
          required_fields: ["nome", "cpf_cnpj", "email"],
          code: "VALIDATION_ERROR",
        });
      }

      const cliente = await Cliente.create(data, trx);
      await trx.commit();

      return response.status(201).json({
        success: true,
        data: cliente,
        message: "Cliente criado com sucesso",
      });
    } catch (error) {
      await trx.rollback();

      // Tratamento de erro de duplicidade
      if (
        error.code === "23505" || // Código PostgreSQL para violação de unicidade
        (error.detail && error.detail.includes("clientes_email_unique"))
      ) {
        return response.status(400).json({
          success: false,
          message: "Email já está em uso por outro cliente",
          code: "EMAIL_DUPLICATE",
        });
      }

      if (
        error.code === "23505" ||
        (error.detail && error.detail.includes("clientes_cpf_cnpj_unique"))
      ) {
        return response.status(400).json({
          success: false,
          message: "CPF/CNPJ já está em uso por outro cliente",
          code: "CPF_CNPJ_DUPLICATE",
        });
      }

      return response.status(400).json({
        success: false,
        message: "Falha ao criar cliente",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "CLIENTE_STORE_ERROR",
      });
    }
  }

  async inativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const cliente = await Cliente.findOrFail(params.id);

      if (!cliente.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Cliente já está inativo",
          code: "ALREADY_INACTIVE",
        });
      }

      cliente.ativo = false;
      await cliente.save();
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Cliente inativado com sucesso",
        data: cliente,
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao inativar cliente",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "INACTIVATION_ERROR",
      });
    }
  }

  async reativar({ params, response }) {
    const trx = await Database.beginTransaction();
    try {
      const cliente = await Cliente.findOrFail(params.id);

      if (cliente.ativo) {
        await trx.rollback();
        return response.status(400).json({
          success: false,
          message: "Cliente já está ativo",
          code: "ALREADY_ACTIVE",
        });
      }

      cliente.ativo = true;
      await cliente.save();
      await trx.commit();

      return response.status(200).json({
        success: true,
        message: "Cliente reativado com sucesso",
        data: cliente,
      });
    } catch (error) {
      await trx.rollback();
      return response.status(500).json({
        success: false,
        message: "Erro ao reativar cliente",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "REACTIVATION_ERROR",
      });
    }
  }

  async update({ params, request, response }) {
    const trx = await Database.beginTransaction();
    try {
      const cliente = await Cliente.findOrFail(params.id);
      const data = request.only([
        "nome",
        "telefone",
        "cpf_cnpj",
        "email",
        "estado",
        "cidade",
        "endereco",
        "numero",
        "complemento",
        "responsavel",
      ]);

      if (data.cpf_cnpj && data.cpf_cnpj !== cliente.cpf_cnpj) {
        const exists = await Cliente.query()
          .where("cpf_cnpj", data.cpf_cnpj)
          .whereNot("id", params.id)
          .first();
        if (exists) {
          await trx.rollback();
          return response.status(400).json({
            success: false,
            message: "CPF/CNPJ já está em uso por outro cliente",
            code: "CPF_CNPJ_DUPLICATE",
          });
        }
      }

      if (data.email && data.email !== cliente.email) {
        const exists = await Cliente.query()
          .where("email", data.email)
          .whereNot("id", params.id)
          .first();
        if (exists) {
          await trx.rollback();
          return response.status(400).json({
            success: false,
            message: "Email já está em uso por outro cliente",
            code: "EMAIL_DUPLICATE",
          });
        }
      }

      cliente.merge(data);
      await cliente.save();
      await trx.commit();

      return response.status(200).json({
        success: true,
        data: cliente,
        message: "Cliente atualizado com sucesso",
      });
    } catch (error) {
      await trx.rollback();
      console.error("Erro ao atualizar cliente:", error);
      return response.status(500).json({
        success: false,
        message: "Falha ao atualizar cliente",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        code: "CLIENTE_UPDATE_ERROR",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
}

module.exports = ClienteController;
