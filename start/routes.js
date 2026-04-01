"use strict";

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use("Route");

Route.get("/", () => {
  return { greeting: "Hello world in JSON" };
});

Route.post("/usuario", "AuthController.register");
Route.post("/login", "AuthController.login");

Route.group(() => {
  Route.get("categorias", "CategoriaController.index");
  Route.post("categorias", "CategoriaController.store");
  Route.get("categorias/:id", "CategoriaController.show");
  Route.put("categorias/:id", "CategoriaController.update");
  Route.delete("categorias/:id", "CategoriaController.destroy");
  Route.put("categorias/:id/reativar", "CategoriaController.reativar");

  Route.get("/users", "UserController.index");
  Route.get("/users/:id", "UserController.show");
  Route.post("/users", "UserController.store");
  Route.put("/users/:id", "UserController.update");
  Route.delete("/users/:id", "UserController.destroy");
  Route.put("/users/:id/ativar", "UserController.ativar");
  Route.put("/users/:id/inativar", "UserController.inativar");

  Route.get("/servicos", "ServicoController.index");
  Route.post("/servicos", "ServicoController.store");
  Route.get("/servicos/:id", "ServicoController.show");
  Route.put("/servicos/:id", "ServicoController.update");
  Route.delete("/servicos/:id", "ServicoController.destroy");
  Route.put("/servicos/:id/reativar", "ServicoController.reativar");

  Route.post("/prestadores", "PrestadorController.store");
  Route.get("prestadores/ativos", "PrestadorController.listarAtivos");
  Route.get("/prestadores", "PrestadorController.index");
  Route.get("/prestadores/:id", "PrestadorController.show");
  Route.put("/prestadores/:id", "PrestadorController.update");
  Route.delete("/prestadores/:id", "PrestadorController.destroy");
  Route.post("/prestadores/:id/servicos", "PrestadorController.addServicos");
  Route.delete(
    "/prestadores/:id/servicos",
    "PrestadorController.removeServicos",
  );
  Route.post("/prestadores/:id/inativar", "PrestadorController.inativar");
  Route.post("/prestadores/:id/reativar", "PrestadorController.reativar");

  Route.post("/clientes", "ClienteController.store");
  Route.get("/clientes", "ClienteController.index");
  Route.get("clientes/ativos", "ClienteController.listarAtivos"); // <-- ANTES DO :id
  Route.get("/clientes/:id", "ClienteController.show"); // <-- DEPOIS
  Route.put("/clientes/:id", "ClienteController.update");
  Route.delete("/clientes/:id", "ClienteController.destroy");
  Route.post("/clientes/:id/inativar", "ClienteController.inativar");
  Route.post("/clientes/:id/reativar", "ClienteController.reativar");

  Route.get("palestra_cursos", "PalestraCursoController.index");
  Route.post("palestra_cursos", "PalestraCursoController.store");
  Route.get("palestra_cursos/:id", "PalestraCursoController.show");
  Route.put("palestra_cursos/:id", "PalestraCursoController.update");
  Route.delete("palestra_cursos/:id", "PalestraCursoController.destroy");
  Route.get(
    "palestra_cursos-simplificado",
    "PalestraCursoController.indexSimplificado",
  );

  Route.get("orcamentos", "OrcamentoController.index");
  Route.post("orcamentos", "OrcamentoController.store");
  Route.put("orcamentos/:id", "OrcamentoController.update").middleware([
    "auth",
  ]);
  Route.delete("orcamentos/:id", "OrcamentoController.destroy");
  Route.get(
    "relatorios/comissoes/vencidas",
    "OrcamentoRelatorioController.getComissoesVencidas",
  );
  Route.get("/relatorios", "OrcamentoRelatorioController.index");
  Route.get("/relatorios/:id", "OrcamentoRelatorioController.show");
  Route.put(
    "orcamento-relatorios/parcela/:id/status",
    "OrcamentoRelatorioController.updatePaymentStatus",
  );
  Route.get(
    "/pendencias/vencidas",
    "OrcamentoRelatorioController.listarTodasPendenciasVencidas",
  );
  Route.get(
    "orcamentos/relatorios/servicos-resumido",
    "OrcamentoRelatorioController.getServicosResumido",
  );
  Route.get(
    "/orcamentos/relatorios/totais",
    "OrcamentoRelatorioController.getTotais",
  );
  Route.put(
    "/relatorios/:id/status",
    "OrcamentoRelatorioController.updatePaymentStatus",
  );
  Route.put(
    "orcamento-relatorio/:id",
    "OrcamentoRelatorioController.updatePaymentStatus",
  );
  Route.put(
    "orcamento-relatorios/parcela/:id/completa",
    "OrcamentoRelatorioController.updateParcelaCompleta",
  );
  Route.put(
    "orcamentos/parcelas/:id/status",
    "OrcamentoRelatorioController.updatePaymentStatus",
  ).middleware("auth");
  Route.get(
    "/relatorio-palestras/total",
    "RelatorioPalestraCursoController.getRelatorioTotal",
  ).middleware(["auth"]);
  Route.post(
    "/palestra_cursos/:id/gerar-relatorios",
    "RelatorioPalestraCursoController.gerarRelatorios",
  ).middleware("auth");
  Route.get("pagamentos", "RelatorioPalestraCursoController.listAllPagamentos");
  Route.put(
    "/pagamentos/:id",
    "RelatorioPalestraCursoController.updateParcelaStatus",
  );
  Route.get("movimentacoes/totals", "MovimentacaoController.getTotals");
  Route.get("/movimentacoes", "MovimentacaoController.index");
  Route.post("/movimentacoes", "MovimentacaoController.store");
  Route.get("/movimentacoes/:id", "MovimentacaoController.show");
  Route.put("/movimentacoes/:id", "MovimentacaoController.update");
  Route.delete("/movimentacoes/:id", "MovimentacaoController.destroy");

  Route.put(
    "parcelas/:id/status",
    "ParcelaPalestraCursoController.updateStatus",
  );

  Route.get("contas-pagar/totais", "ContaPagarController.getTotais");

  Route.get("contas/:id", "ContaPagarController.show");
  Route.get(
    "contas-pagar/parcelas/pendentes",
    "ContaPagarController.listarParcelasPendentes",
  );
  Route.get("/contas", "ContaPagarController.index");
  Route.post("/contas", "ContaPagarController.store");
  Route.get("/contas-pagar/imprimir", "ContaPagarController.imprimir");

  Route.put("/parcelas/:id", "ContaPagarController.updateParcela");
  Route.put(
    "parcelas-contas/:id",
    "ContaPagarController.updateParcelaIndividual",
  );
  Route.delete("contas-pagar/:id", "ContaPagarController.destroy");
  Route.put(
    "contas-pagar/parcelas/:id",
    "ContaPagarController.updateParcelaIndividual",
  );

  Route.put("contas-pagar/:id", "ContaPagarController.update");
  Route.get("/contas-receber/totais", "ContaReceberController.getTotais");
  Route.get(
    "contas-receber/parcelas-vencidas",
    "ContaReceberController.getParcelasVencidas",
  );
  Route.post("contas-receber", "ContaReceberController.store");
  Route.get("contas-receber", "ContaReceberController.index");
  Route.get("contas-receber/:id", "ContaReceberController.show");
  Route.put(
    "contas-receber/parcelas/:id/pagar",
    "ContaReceberController.pagarParcela",
  );
  Route.get(
    "contas-pagar/variaveis/pendentes",
    "ContaPagarController.listarContasVariaveisPendentes",
  );
  Route.get(
    "contas-pagar/todas-pendentes",
    "ContaPagarController.listarTodasPendentes",
  );

  Route.get("tipo-palestras", "TipoPalestraController.index");
  Route.post("tipo-palestras", "TipoPalestraController.store");
  Route.put("tipo-palestras/:id", "TipoPalestraController.update");
  Route.put("tipo-palestras/:id/inativar", "TipoPalestraController.inativar");
  Route.put("tipo-palestras/:id/reativar", "TipoPalestraController.reativar");

  Route.put("contas-receber/:id", "ContaReceberController.update").middleware([
    "auth",
  ]);
  Route.delete("/contas-receber/:id", "ContaReceberController.destroy");
  Route.put(
    "contas-receber/parcelas/:id",
    "ContaReceberController.updateParcela",
  ).middleware(["auth"]);
}).middleware(["auth"]);
