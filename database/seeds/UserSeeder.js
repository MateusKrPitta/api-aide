// database/seeds/UserSeeder.js
"use strict";

const User = use("App/Models/User");

class UserSeeder {
  async run() {
    const userExists = await User.findBy("username", "mateus");
    if (!userExists) {
      await User.create({
        nome: "Mateus",
        username: "mateus",
        email: "mateus@example.com",
        password: "senha123",
        telefone: "(11) 99999-9999",
        permissao: 5,
      });
      console.log("Usuário mateus@example.com criado com senha: senha123");
    } else {
      console.log("Usuário mateus já existe.");
    }
  }
}

module.exports = UserSeeder;
