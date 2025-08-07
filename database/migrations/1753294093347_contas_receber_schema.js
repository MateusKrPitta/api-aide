"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class ContasReceberSchema extends Schema {
  up() {
    this.create("contas_receber", (table) => {
      table.increments();
      table.string("nome").notNullable();
      table.boolean("custo_fixo").defaultTo(false);
      table.boolean("custo_variavel").defaultTo(false);
      table
        .integer("prestador_id")
        .unsigned()
        .references("id")
        .inTable("prestadores")
        .onDelete("SET NULL");
      table.date("data_inicio").notNullable();
      table.date("data_fim").notNullable();
      table.decimal("valor_mensal", 10, 2).nullable();
      table.decimal("valor_total", 10, 2).nullable();
      table
        .integer("categoria_id")
        .unsigned()
        .references("id")
        .inTable("categorias")
        .onDelete("CASCADE");
      table.timestamps();
    });
  }

  down() {
    this.drop("contas_receber");
  }
}

module.exports = ContasReceberSchema;
