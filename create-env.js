const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

// Template do .env com valores padrão seguros
const envContent = `
HOST=0.0.0.0
PORT=3000
NODE_ENV=production
APP_NAME=AdonisJS
APP_URL=http://0.0.0.0:3000
CACHE_VIEWS=false
APP_KEY=${process.env.APP_KEY}
DB_CONNECTION=pg
DB_HOST=${process.env.DB_HOST}
DB_PORT=5432
DB_USER=${process.env.DB_USER}
DB_PASSWORD=${process.env.DB_PASSWORD}
DB_DATABASE=${process.env.DB_DATABASE}
HASH_DRIVER=bcrypt
`.trim();

fs.writeFileSync(envPath, envContent);
console.log("✅ Arquivo .env criado com sucesso");
