const fs = require("fs");

const envVars = `
APP_NAME=AdonisJs
APP_ENV=production
APP_KEY=COLOQUE_SUA_APP_KEY_AQUI
APP_DEBUG=false
HOST=0.0.0.0
PORT=8080
NODE_ENV=production

DB_CONNECTION=pg
DB_HOST=${process.env.DB_HOST}
DB_PORT=${process.env.DB_PORT}
DB_USER=${process.env.DB_USER}
DB_PASSWORD=${process.env.DB_PASSWORD}
DB_DATABASE=${process.env.DB_DATABASE}

HASH_DRIVER=bcrypt
SESSION_DRIVER=cookie
`;

fs.writeFileSync(".env", envVars.trim());
console.log("✅ .env criado com sucesso!");
