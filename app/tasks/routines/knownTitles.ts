// Titles the app itself suggests (templates and room suggestions). They are stored as text in the
// language of whoever picked them, and shown in the reader's language when they still match one
// of these. Anything somebody typed or changed themselves is shown exactly as written.

import type { Bilingual } from "./i18n.ts";
import { ROOM_SUGGESTIONS } from "./rooms.ts";
import { ROUTINE_TEMPLATES } from "./templates.ts";

function build(): Bilingual[] {
  const seen = new Set<string>();
  const out: Bilingual[] = [];
  const add = (b: Bilingual) => {
    const key = `${b.en}|${b.de}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(b);
  };
  for (const t of ROUTINE_TEMPLATES) add(t.title);
  for (const list of Object.values(ROOM_SUGGESTIONS)) for (const sug of list) add(sug.title);
  return out;
}

export const KNOWN_TITLES: Bilingual[] = build();
