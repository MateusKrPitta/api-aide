const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Garante que todas variáveis necessárias existam
const requiredVars = {
  DB_HOST: process.env.DB_HOST || "postgres.railway.internal",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  DB_DATABASE: process.env.DB_DATABASE || "railway",
};

const envContent = `
DB_CONNECTION=pg
DB_HOST=${requiredVars.DB_HOST}
DB_PORT=5432
DB_USER=${requiredVars.DB_USER}
DB_PASSWORD=${requiredVars.DB_PASSWORD}
DB_DATABASE=${requiredVars.DB_DATABASE}
`.trim();

fs.writeFileSync(envPath, envContent);
console.log("✅ .env criado com configurações do banco");
