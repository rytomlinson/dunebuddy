import { TRPCError } from '@trpc/server';
import type { EditSummary, RuleEdit, RuleEditInput, RuleSection } from 'common';
import { query, withTransaction } from '../db.js';

interface SectionRow {
  id: string;
  level: number;
  title: string;
  position: number;
  source: string;
  body: string;
  edit_count: number;
  last_editor: string | null;
  last_explanation: string | null;
  last_edited_at: Date | null;
}

interface EditRow {
  id: number;
  section_id: string;
  section_title: string;
  editor_name: string;
  explanation: string;
  body_before: string;
  body_after: string;
  created_at: Date;
}

function lastEdit(r: SectionRow): EditSummary | null {
  if (!r.last_editor || !r.last_edited_at) return null;
  return { editorName: r.last_editor, explanation: r.last_explanation ?? '', createdAt: r.last_edited_at.toISOString() };
}

function toEdit(r: EditRow): RuleEdit {
  return {
    id: r.id,
    sectionId: r.section_id,
    sectionTitle: r.section_title,
    editorName: r.editor_name,
    explanation: r.explanation,
    bodyBefore: r.body_before,
    bodyAfter: r.body_after,
    createdAt: r.created_at.toISOString(),
  };
}

export async function listSections(): Promise<RuleSection[]> {
  const { rows } = await query<SectionRow>(
    `SELECT s.id, s.level, s.title, s.position, s.source, s.body, s.edit_count,
            e.editor_name AS last_editor, e.explanation AS last_explanation, e.created_at AS last_edited_at
     FROM rule_sections s
     LEFT JOIN LATERAL (
       SELECT editor_name, explanation, created_at FROM rule_edits
       WHERE section_id = s.id ORDER BY created_at DESC, id DESC LIMIT 1
     ) e ON true
     ORDER BY s.position`
  );
  return rows.map((r) => ({
    id: r.id,
    level: r.level,
    title: r.title,
    position: r.position,
    source: r.source,
    body: r.body,
    editCount: r.edit_count,
    lastEdit: lastEdit(r),
  }));
}

const EDIT_SELECT = `SELECT e.id, e.section_id, s.title AS section_title, e.editor_name, e.explanation,
  e.body_before, e.body_after, e.created_at
  FROM rule_edits e JOIN rule_sections s ON s.id = e.section_id`;

export async function sectionHistory(sectionId: string): Promise<{ original: string; edits: RuleEdit[] }> {
  const { rows: sec } = await query<{ original_body: string }>(
    `SELECT original_body FROM rule_sections WHERE id = :sectionId`,
    { sectionId }
  );
  if (!sec[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Section not found' });
  const { rows } = await query<EditRow>(
    `${EDIT_SELECT} WHERE e.section_id = :sectionId ORDER BY e.created_at DESC, e.id DESC`,
    { sectionId }
  );
  return { original: sec[0].original_body, edits: rows.map(toEdit) };
}

export async function listEdits(limit = 200): Promise<RuleEdit[]> {
  const { rows } = await query<EditRow>(`${EDIT_SELECT} ORDER BY e.created_at DESC, e.id DESC LIMIT :limit`, {
    limit,
  });
  return rows.map(toEdit);
}

export async function editSection(input: RuleEditInput): Promise<{ editCount: number }> {
  return withTransaction(async (q) => {
    const { rows } = await q<{ body: string; edit_count: number }>(
      `SELECT body, edit_count FROM rule_sections WHERE id = :id FOR UPDATE`,
      { id: input.sectionId }
    );
    const sec = rows[0];
    if (!sec) throw new TRPCError({ code: 'NOT_FOUND', message: 'Section not found' });
    if (sec.edit_count !== input.baseEditCount) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Someone else edited this section while you were typing. Copy your text, reload, and try again.',
      });
    }
    const body = input.body.replace(/\r\n/g, '\n').trim();
    if (body === sec.body) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing changed.' });
    }
    await q(
      `INSERT INTO rule_edits (section_id, editor_name, explanation, body_before, body_after)
       VALUES (:id, :editorName, :explanation, :before, :after)`,
      {
        id: input.sectionId,
        editorName: input.editorName,
        explanation: input.explanation,
        before: sec.body,
        after: body,
      }
    );
    const { rows: updated } = await q<{ edit_count: number }>(
      `UPDATE rule_sections SET body = :body, edit_count = edit_count + 1, updated_at = NOW()
       WHERE id = :id RETURNING edit_count`,
      { id: input.sectionId, body }
    );
    return { editCount: updated[0].edit_count };
  });
}
