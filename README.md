# oxxx

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_OGomAO1ym2j4uqyvI6MkLHFqDk8z)

## Presale ledger

`GET /api/presale` still returns `raised` and `updatedAt` for the homepage. `raised` is the sum of confirmed USDT transfers into the presale address, not the raw wallet balance. Field definitions, the per-wallet lookup, and how to run the indexer on Vercel Cron or as a worker are in [docs/presale-api.md](docs/presale-api.md).

The admin API, KYC review, and Docker Compose stack are documented in [backend/README.md](backend/README.md)（中文）.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
