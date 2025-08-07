"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class MovimentacaoSchema extends Schema {
  up() {
    this.create("movimentacoes", (table) => {
      table.increments();

      table
        .integer("tipo") // 1 = entrada, 2 = saída
        .notNullable();

      table.string("assunto").notNullable();

      table.text("observacao").nullable();

      table
        .integer("categoria_id")
        .unsigned()
        .references("id")
        .inTable("categorias")
        .onDelete("CASCADE")
        .notNullable();

      table.decimal("valor", 12, 2).notNullable();

      table.timestamps();
    });
  }

  down() {
    this.drop("movimentacoes");
  }
}

module.exports = MovimentacaoSchema;
