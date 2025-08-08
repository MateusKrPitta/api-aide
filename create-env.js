const fs = require("fs");
const path = require("path");

// Caminho absoluto para .env na raiz do app
const envPath = path.join(__dirname, ".env");

// Variáveis prioritárias do Railway + fallbacks
const envVars = {
  APP_KEY: process.env.APP_KEY || "sua-chave-32-caracteres-aqui",
  DB_CONNECTION: "pg",
  DB_HOST: process.env.RAILWAY_PRIVATE_DOMAIN || process.env.PGHOST,
  DB_PORT: "5432",
  DB_USER: process.env.POSTGRES_USER || process.env.PGUSER,
  DB_PASSWORD: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD,
  DB_DATABASE: process.env.POSTGRES_DB || process.env.PGDATABASE,
};

// Garante que o .env tenha todas variáveis necessárias
let envContent = "";
Object.entries(envVars).forEach(([key, value]) => {
  if (value) envContent += `${key}=${value}\n`;
});

// Cria/sobrescreve o .env
fs.writeFileSync(envPath, envContent);
console.log("✅ .env criado com sucesso em:", envPath);
