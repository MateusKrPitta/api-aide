"use strict";

const Schema = use("Schema");

class ServicosSchema extends Schema {
  up() {
    this.create("servicos", (table) => {
      table.increments();
      table.string("nome").notNullable();
      table.text("descricao");
      table
        .integer("categoria_id")
        .unsigned()
        .references("id")
        .inTable("categorias")
        .onDelete("CASCADE");
      table.boolean("ativo").defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop("servicos");
  }
}

module.exports = ServicosSchema;
