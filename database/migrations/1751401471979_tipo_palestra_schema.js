"use strict";

const Schema = use("Schema");

class CreateTipoPalestrasTable extends Schema {
  up() {
    this.create("tipo_palestras", (table) => {
      table.increments();
      table.string("nome", 80).notNullable().unique();
      table.boolean("ativo").defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop("tipo_palestras");
  }
}

module.exports = CreateTipoPalestrasTable;
