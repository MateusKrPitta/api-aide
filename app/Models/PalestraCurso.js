"use strict";

const Model = use("Model");

class PalestraCurso extends Model {
  static get table() {
    return "palestra_cursos";
  }

  tipoPalestra() {
    return this.belongsTo("App/Models/TipoPalestra", "tipo_palestra_id", "id");
  }

  cliente() {
    return this.belongsTo("App/Models/Cliente", "cliente_id", "id");
  }

  relatorios() {
    return this.hasMany(
      "App/Models/RelatorioPalestraCurso",
      "id",
      "palestra_curso_id",
    );
  }

  parcelas() {
    return this.hasMany(
      "App/Models/ParcelaPalestraCurso",
      "id",
      "palestra_curso_id",
    );
  }
}

module.exports = PalestraCurso;
