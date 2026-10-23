# Mediaboxd

Rede social para registrar e avaliar **jogos, animes, mangás e livros** num só lugar, no estilo do Letterboxd.

## Funcionalidades

- Catálogo unificado com dados do **IGDB** (jogos), **AniList** (animes e mangás) e **Open Library** (livros)
- Status por obra: quero ver, em andamento, concluído, pausado, abandonado
- Reviews com curtidas e comentários, e nota por episódio
- Listas personalizadas, metas e ranking
- Perfil com estatísticas, seguidores, feed de atividades e notificações
- Moderação: denúncias de reviews, comentários e listas, com painel de admin
- Interface em português e inglês
- Funciona como app instalável (PWA), com página offline

## Tecnologias

Next.js 16 · React 19 · TypeScript · Prisma · PostgreSQL · Auth.js · Tailwind CSS · Zod · Vercel

## Rodando localmente

```bash
npm install
cp .env.example .env      # preencha as variáveis
npx prisma migrate dev
npm run dev
```

Abra http://localhost:3000.

### Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `AUTH_SECRET` | Segredo do Auth.js (gere um valor aleatório) |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | Busca de jogos (credenciais da Twitch) |
| `PERSPECTIVE_API_KEY` | Opcional: moderação automática de comentários |
