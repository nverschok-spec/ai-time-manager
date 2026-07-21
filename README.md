# AI Time Manager — стартовый каркас (Этап 1)

Это подготовленный скелет проекта по техническому заданию
`AI-timemanager-spec-v2.md` (положи этот файл рядом, в корень проекта —
Claude Code будет на него ссылаться).

## Что уже готово

- Vite + React + Tailwind настроены (`vite.config.js`, `tailwind.config.js`)
- PWA-плагин подключён (`vite-plugin-pwa`) — манифест генерируется из конфига
- `react-i18next` настроен, все **три языка (DE, RU, EN) заполнены полноценно**
  (`src/i18n/de.json`, `ru.json`, `en.json`)
- Структура папок по ТЗ: `src/components`, `src/services`, `api`, `src/i18n`
- Заготовка serverless-прокси `api/ai-parse.js` — ключ читается только из
  `process.env`, ничего не логируется (важно для приватности, см. ТЗ раздел 5)
- `.env.example` — шаблон переменной окружения, реальный `.env.local` **не**
  коммитится (уже в `.gitignore`)

Компоненты в `src/components/*.jsx` и `src/services/ai.js` — это заготовки
с комментариями `TODO(Этап N)`, наполняются по мере прохождения этапов.

## Как запустить локально

```bash
cd ai-time-manager
npm install
npm run dev
```

Откроется на `http://localhost:5173`.

## Как выложить на Vercel (бесплатно, без домена)

1. Создай **новый пустой репозиторий** на GitHub (приватный).
2. В этой папке:
   ```bash
   git init
   git add .
   git commit -m "Stage 1: project scaffold"
   git branch -M main
   git remote add origin <ссылка на твой репозиторий>
   git push -u origin main
   ```
3. Зайди на vercel.com → **Add New Project** → импортируй этот репозиторий.
4. В настройках проекта на Vercel добавь переменную окружения
   `ANTHROPIC_API_KEY` (Settings → Environment Variables) — **не** клади
   реальный ключ в `.env` файл, который коммитится.
5. Deploy — получишь адрес вида `твой-проект.vercel.app`.

Это отдельный, независимый проект в твоём аккаунте Vercel — существующий
проект он никак не затронет.

## Как открыть в VS Code / Claude Code

Открой **отдельное новое окно** VS Code именно на эту папку:

```bash
code /путь/до/ai-time-manager
```

Не открывай её в том же окне, где уже идёт работа над другим проектом —
это разные независимые директории, но проще держать их физически в разных
окнах, чтобы не перепутать чаты.

Дальше просто вставь в чат Claude Code:

> Продолжаем работу по AI-timemanager-spec-v2.md. Сейчас нужно закончить
> Этап 1 (проверить, что PWA/i18n/прокси корректно связаны) и перейти к
> Этапу 2 (UI).

## Текущий статус (по плану из ТЗ)

- [x] Этап 1: реальные иконки PWA (`public/icons/icon-192.png`,
      `icon-512.png`), сборка (`npm run build`) проверена
- [x] Этап 2: UI — `CalendarView`, `ProgressCircle`, `VoiceAiInput`,
      `AiSuggestionCard`, `LanguageSwitcher` реализованы и визуально проверены
- [x] Этап 3: `services/ai.js` собирает компактный контекст расписания
      (±7 дней), `api/ai-parse.js` реально вызывает Anthropic API
      (`claude-opus-4-8`, structured output), размечает конфликты и
      низкую уверенность
- [x] Этап 4: `src/store/useAppStore.js` (Zustand + persist в localStorage),
      экспорт/импорт JSON из настроек

**Важно:** локально через `npm run dev` (чистый Vite) эндпоинт `/api/ai-parse`
не поднимается — Vercel serverless-функции работают только через `vercel dev`
или после деплоя. Также нужна переменная окружения `ANTHROPIC_API_KEY`
(см. `.env.example`), иначе функция вернёт 500.
