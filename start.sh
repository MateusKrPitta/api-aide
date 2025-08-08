#!/bin/bash

# Rodar migrations
node ace migration:run --force

# Iniciar o servidor
node server.js
