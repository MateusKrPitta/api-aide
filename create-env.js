const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Só cria o arquivo .env se estiver no Railway e o arquivo não existir
if (process.env.RAILWAY_ENVIRONMENT && !fs.existsSync(envPath)) {
  const envContent = `
HOST=${process.env.HOST || "0.0.0.0"}
PORT=${process.env.PORT || "3000"}
NODE_ENV=${process.env.NODE_ENV || "production"}
APP_NAME=${process.env.APP_NAME || "AdonisJS"}
APP_URL=${
    process.env.APP_URL ||
    `http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || "3000"}`
  }
CACHE_VIEWS=${process.env.CACHE_VIEWS || "false"}
APP_KEY=${process.env.APP_KEY}
DB_CONNECTION=${process.env.DB_CONNECTION || "pg"}
DB_HOST=${process.env.DB_HOST}
DB_PORT=${process.env.DB_PORT || "5432"}
DB_USER=${process.env.DB_USER}
DB_PASSWORD=${process.env.DB_PASSWORD}
DB_DATABASE=${process.env.DB_DATABASE}
HASH_DRIVER=${process.env.HASH_DRIVER || "bcrypt"}
  `.trim();

  fs.writeFileSync(envPath, envContent);
  console.log("Arquivo .env criado para o Railway");
}
