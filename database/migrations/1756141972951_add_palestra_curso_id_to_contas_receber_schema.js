"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class AddPalestraCursoIdToContasReceberSchema extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      table
        .integer("palestra_curso_id")
        .unsigned()
        .references("id")
        .inTable("palestra_cursos")
        .onDelete("CASCADE");
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      table.dropColumn("palestra_curso_id");
    });
  }
}

module.exports = AddPalestraCursoIdToContasReceberSchema;
