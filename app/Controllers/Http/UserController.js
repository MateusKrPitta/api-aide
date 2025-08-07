"use strict";

const User = use("App/Models/User");

class UserController {
  /**
   * Lista todos os usuários (com paginação)
   */
  async index({ request, response }) {
    try {
      const { page = 1, perPage = 10 } = request.all();

      const users = await User.query()
        .select(["id", "nome", "email", "permissao", "ativo", "created_at"])
        .paginate(page, perPage);

      return response.status(200).json({
        status: "success",
        data: users,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao listar usuários",
        debug: error.message,
      });
    }
  }

  /**
   * Cria um novo usuário (admin apenas)
   */
  async store({ request, response, auth }) {
    try {
      // Verifica se o usuário atual é admin
      await auth.check();
      const userAuth = await auth.getUser();

      if (userAuth.permissao < 5) {
        return response.status(403).json({
          status: "error",
          message: "Apenas administradores podem criar usuários",
        });
      }

      const data = request.only([
        "nome",
        "username",
        "email",
        "password",
        "telefone",
        "permissao",
      ]);

      // Validações
      if (!data.email || !data.password) {
        return response.status(400).json({
          status: "error",
          message: "E-mail e senha são obrigatórios",
        });
      }

      const user = await User.create(data);

      return response.status(201).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao criar usuário",
        debug: error.message,
      });
    }
  }

  async ativar({ params, response, auth }) {
    try {
      // Verifica se é admin
      await auth.check();
      const userAuth = await auth.getUser();

      if (userAuth.permissao < 5) {
        return response.status(403).json({
          status: "error",
          message: "Apenas administradores podem ativar usuários",
        });
      }

      const user = await User.findOrFail(params.id);
      user.ativo = true;
      await user.save();

      return response.status(200).json({
        status: "success",
        message: "Usuário ativado com sucesso",
        data: user,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao ativar usuário",
        debug: error.message,
      });
    }
  }

  async inativar({ params, response, auth }) {
    try {
      // Verifica se é admin
      await auth.check();
      const userAuth = await auth.getUser();

      if (userAuth.permissao < 5) {
        return response.status(403).json({
          status: "error",
          message: "Apenas administradores podem inativar usuários",
        });
      }

      // Impede que admin inative a si mesmo
      if (userAuth.id == params.id) {
        return response.status(403).json({
          status: "error",
          message: "Você não pode inativar a si mesmo",
        });
      }

      const user = await User.findOrFail(params.id);
      user.ativo = false;
      await user.save();

      return response.status(200).json({
        status: "success",
        message: "Usuário inativado com sucesso",
        data: user,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao inativar usuário",
        debug: error.message,
      });
    }
  }

  /**
   * Exibe um usuário específico
   */
  async show({ params, response }) {
    try {
      const user = await User.findOrFail(params.id);

      return response.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      return response.status(404).json({
        status: "error",
        message: "Usuário não encontrado",
      });
    }
  }

  /**
   * Atualiza um usuário
   */
  async update({ params, request, response, auth }) {
    try {
      const user = await User.findOrFail(params.id);
      const data = request.only([
        "nome",
        "username",
        "email",
        "telefone",
        "permissao",
        "password",
      ]);

      // Verifica permissão (só pode editar outros se for admin)
      const userAuth = await auth.getUser();
      if (user.id !== userAuth.id && userAuth.permissao < 5) {
        return response.status(403).json({
          status: "error",
          message: "Você não tem permissão para editar este usuário",
        });
      }

      user.merge(data);
      await user.save();

      return response.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao atualizar usuário",
        debug: error.message,
      });
    }
  }

  /**
   * Remove um usuário (admin apenas)
   */
  async destroy({ params, response, auth }) {
    try {
      // Verifica se é admin
      await auth.check();
      const userAuth = await auth.getUser();

      if (userAuth.permissao < 5) {
        return response.status(403).json({
          status: "error",
          message: "Apenas administradores podem remover usuários",
        });
      }

      const user = await User.findOrFail(params.id);
      await user.delete();

      return response.status(204).json(null);
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Erro ao remover usuário",
        debug: error.message,
      });
    }
  }
}

module.exports = UserController;
