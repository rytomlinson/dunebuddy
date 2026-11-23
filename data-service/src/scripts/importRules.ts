/**
 * Loads rulebook sections from a JSON file into the rules knowledge base.
 *
 *   npm run import-rules -w data-service -- /path/to/rules.json
 *
 * The JSON is built from the rulebook PDFs and is not kept in git (the text is GF9's).
 * Safe to re-run: new sections are added, untouched sections are refreshed, and a section
 * anyone has edited keeps its edited text (only its title, position and source update).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';
import { closeDb, initDb, query, withTransaction } from '../db.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const FileSchema = z.array(
  z.object({
    id: z.string().min(1).max(200),
    level: z.number().int().min(1).max(3),
    title: z.string().min(1).max(200),
    position: z.number().int(),
    source: z.string().max(200),
    body: z.string(),
  })
);

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: import-rules <rules.json>');
  const sections = FileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));

  initDb(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST ?? 'localhost',
          port: parseInt(process.env.DB_PORT ?? '5432', 10),
          database: process.env.DB_NAME ?? 'dunebuddy',
          user: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASSWORD ?? '',
        }
  );

  const counts = await withTransaction(async (q) => {
    let added = 0;
    let refreshed = 0;
    let keptEdits = 0;
    for (const s of sections) {
      const { rows } = await q<{ edit_count: number }>(`SELECT edit_count FROM rule_sections WHERE id = :id`, {
        id: s.id,
      });
      if (!rows[0]) {
        await q(
          `INSERT INTO rule_sections (id, level, title, position, source, original_body, body)
           VALUES (:id, :level, :title, :position, :source, :body, :body)`,
          s
        );
        added++;
      } else if (rows[0].edit_count === 0) {
        await q(
          `UPDATE rule_sections SET level = :level, title = :title, position = :position, source = :source,
             original_body = :body, body = :body, updated_at = NOW() WHERE id = :id`,
          s
        );
        refreshed++;
      } else {
        await q(
          `UPDATE rule_sections SET level = :level, title = :title, position = :position, source = :source
           WHERE id = :id`,
          s
        );
        keptEdits++;
      }
    }
    return { added, refreshed, keptEdits };
  });

  const { rows } = await query<{ n: string }>(`SELECT count(*) AS n FROM rule_sections`);
  console.log(
    `Imported ${sections.length} sections: ${counts.added} added, ${counts.refreshed} refreshed, ` +
      `${counts.keptEdits} kept their edits. ${rows[0].n} sections in the database.`
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
