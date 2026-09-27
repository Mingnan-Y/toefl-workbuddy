# TOEFL WorkBuddy

A personal TOEFL review workspace with Recent, Mistakes, Vocabulary, Writing Templates, and Interview sections. Users can add, edit, and delete cards and format selected text.

## Run locally

Requires Node.js 22.13+ and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The application expects a Cloudflare D1 database bound as `DB`; see `db/`, `drizzle/`, and `vite.config.ts` for the schema and local configuration. Apply the SQL migrations in `drizzle/` to the local D1 database before using the app. The committed `.openai/hosting.json` contains a placeholder project ID; replace it with your own before publishing to ChatGPT Sites. Deploying elsewhere requires adapting the hosting and authentication configuration.

## Personal data

Review records are stored in the site's database. This repository contains the application code and schema only; it does not contain personal mistakes, vocabulary, interview answers, writing templates, database exports, or credentials. Add your own records through the app.
