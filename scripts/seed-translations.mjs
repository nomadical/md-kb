// Seed a few PUBLISHED German article translations (demo/QA content) into the
// target env's DB, so the per-language reader + translation-aware search/RAG can
// be exercised end to end. Idempotent: re-running upserts the same rows.
//
// Matches source articles by exact title (slugs differ per env), then upserts
// into public.article_translations via the service role. Articles not found are
// skipped (logged). Run AFTER the migration that creates article_translations,
// and run the embed indexer afterwards so the German content is searchable.
//
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Usage: node scripts/seed-translations.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(URL, SERVICE, { auth: { persistSession: false } });

// language: "de". Keyed by the EXACT source-article title in the target env.
const TRANSLATIONS = [
  {
    sourceTitle: "Intro",
    language: "de",
    title: "Einführung",
    content: `# Einführung

Willkommen in der SkyMind-Wissensdatenbank. Hier findest du Anleitungen, FAQs und How-tos rund um die SkyCell-Plattform.

## Was du hier findest

- Schritt-für-Schritt-Anleitungen für Asset- und Shipment-Management
- Antworten auf häufige Fragen
- Tipps für die tägliche Arbeit mit SkyMind

## Erste Schritte

Nutze die Suche oben oder stöbere über die Seitenleiste durch die Kategorien. Wenn du eine konkrete Frage hast, probiere die Funktion „Wissensdatenbank fragen“.`,
  },
  {
    sourceTitle: "How to Change your Password",
    language: "de",
    title: "Passwort ändern",
    content: `# Passwort ändern

So änderst du dein SkyMind-Passwort.

## Schritte

1. Öffne oben rechts das Benutzermenü und wähle **Profil**.
2. Klicke auf **Passwort ändern**.
3. Gib dein aktuelles Passwort sowie zweimal das neue Passwort ein.
4. Bestätige mit **Speichern**.

## Hinweise

- Das neue Passwort muss mindestens acht Zeichen lang sein.
- Verwende eine Kombination aus Buchstaben, Zahlen und Sonderzeichen.
- Hast du dein Passwort vergessen, nutze auf der Anmeldeseite den Link **Passwort vergessen**.`,
  },
  {
    sourceTitle: "Login to SkyMind",
    language: "de",
    title: "Bei SkyMind anmelden",
    content: `# Bei SkyMind anmelden

So meldest du dich bei SkyMind an.

## Anmeldung

1. Rufe die SkyMind-Startseite auf.
2. Klicke auf **Anmelden**.
3. Melde dich mit deinen Unternehmens-Zugangsdaten (Single Sign-on) an.

## Probleme bei der Anmeldung

- Stelle sicher, dass du die richtige Unternehmens-URL verwendest.
- Schlägt die Anmeldung fehl, wende dich an deinen Administrator.
- Nach mehreren Fehlversuchen kann dein Konto vorübergehend gesperrt werden.`,
  },
];

let seeded = 0;
for (const tr of TRANSLATIONS) {
  const { data: article, error: findErr } = await db
    .from("articles")
    .select("id,title")
    .eq("title", tr.sourceTitle)
    .is("deleted_at", null)
    .eq("published", true)
    .maybeSingle();
  if (findErr) {
    console.error(`  ! "${tr.sourceTitle}": ${findErr.message}`);
    continue;
  }
  if (!article) {
    console.log(`  - "${tr.sourceTitle}": no published article found, skipping`);
    continue;
  }
  const { error: upErr } = await db
    .from("article_translations")
    .upsert(
      {
        article_id: article.id,
        language: tr.language,
        title: tr.title,
        content: tr.content,
        status: "published",
      },
      { onConflict: "article_id,language" },
    );
  if (upErr) {
    console.error(`  ! "${tr.sourceTitle}" [${tr.language}]: ${upErr.message}`);
    continue;
  }
  console.log(`  ✓ "${tr.sourceTitle}" → ${tr.language}: "${tr.title}"`);
  seeded++;
}

console.log(`\nSeeded ${seeded}/${TRANSLATIONS.length} translations.`);
