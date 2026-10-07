# The Last of Guss — запуск

## Требования

- Node.js 20+
- PostgreSQL

## 1. Contract

```bash
cd contract && npm install && npm run build
```

## 2. Backend

```bash
cd server
cp env.example .env   # поправь DB_URI под свою БД
npm install
npm run build
npm start             # node dist/main.js
```

Dev: `npm run start:dev`

## 3. Frontend

```bash
cd client
npm install
npm run dev
```

По умолчанию API: `http://localhost:3000` (`VITE_API_URL`).

## Роли

| Username | Роль |
|----------|------|
| `admin` | создаёт раунды |
| `Никита` | тапы принимаются, в статистике всегда 0 |
| любой другой | выживший (тапает) |

Если пользователя нет — создаётся при логине. Неверный пароль у существующего — ошибка под кнопкой.

Сиды при первом старте: `roma/roma`, `admin/admin`.
