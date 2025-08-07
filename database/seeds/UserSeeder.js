// database/seeds/UserSeeder.js
"use strict";

const User = use("App/Models/User");

class UserSeeder {
  async run() {
    await User.create({
      nome: "Mateus",
      username: "mateus",
      email: "mateus@example.com", // EXATAMENTE o mesmo e-mail que você está tentando logar
      password: "senha123",
      telefone: "(11) 99999-9999",
      permissao: 5,
    });

    console.log("Usuário mateus@example.com criado com senha: senha123");
  }
}

module.exports = UserSeeder;
