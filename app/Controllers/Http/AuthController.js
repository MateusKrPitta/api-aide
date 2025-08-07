"use strict";

const User = use("App/Models/User");

class AuthController {
  async register({ request, response }) {
    try {
      const data = request.only([
        "nome",
        "username",
        "email",
        "password",
        "telefone",
        "permissao",
      ]);

      if (!data.username || !data.email || !data.password) {
        return response.status(400).json({
          status: "error",
          message: "Por favor, forneça username, email e password",
        });
      }

      if (data.permissao) {
        data.permissao = Math.min(5, Math.max(1, parseInt(data.permissao)));
      } else {
        data.permissao = 1;
      }

      const user = await User.create(data);

      return response.status(201).json({
        status: "success",
        message: "Usuário registrado com sucesso",
        data: user,
      });
    } catch (error) {
      return response.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao registrar o usuário",
        debug: error.message,
      });
    }
  }

  async login({ auth, request, response }) {
    try {
      const { email, password } = request.all();

      if (!email || !password) {
        return response.status(400).json({
          status: "error",
          message: "Por favor, forneça email e password",
        });
      }

      const token = await auth.attempt(email, password);

      const user = await User.findBy("email", email);

      return response.json({
        status: "success",
        message: "Login realizado com sucesso",
        data: {
          token,
          user: {
            id: user.id,
            nome: user.nome,
            username: user.username,
            email: user.email,
            telefone: user.telefone,
            permissao: user.permissao,
          },
        },
      });
    } catch (error) {
      return response.status(400).json({
        status: "error",
        message: "Credenciais inválidas ou usuário não encontrado",
        debug: error.message,
      });
    }
  }
}

module.exports = AuthController;
