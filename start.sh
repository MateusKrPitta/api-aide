#!/bin/bash
node create-env.js
node ace migration:run --force
node server.js