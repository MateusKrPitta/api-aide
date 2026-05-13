const Database = use("Database");

async function find() {
  try {
    console.log('Searching for orçamentos with "Paid" installments...');

    const blockedReceber = await Database.table('contas_receber_parcelas')
      .join('contas_receber', 'contas_receber_parcelas.conta_receber_id', 'contas_receber.id')
      .where('contas_receber_parcelas.status_pagamento', 2)
      .select('contas_receber.orcamento_id', 'contas_receber_parcelas.id as parcela_id', 'contas_receber_parcelas.descricao')
      .limit(10);

    const blockedPagar = await Database.table('contas_pagar_parcelas')
      .join('contas_pagar', 'contas_pagar_parcelas.conta_pagar_id', 'contas_pagar.id')
      .where('contas_pagar_parcelas.status', 2)
      .select('contas_pagar.orcamento_id', 'contas_pagar_parcelas.id as parcela_id', 'contas_pagar_parcelas.descricao')
      .limit(10);

    console.log('--- Blocked by Contas Receber ---');
    console.log(JSON.stringify(blockedReceber, null, 2));

    console.log('--- Blocked by Contas Pagar ---');
    console.log(JSON.stringify(blockedPagar, null, 2));

    // Also check the most recent orçamentos to see their IDs
    const recent = await Database.table('orcamentos').orderBy('id', 'desc').limit(5);
    console.log('--- Recent Orçamentos ---');
    console.log(JSON.stringify(recent, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

find();
