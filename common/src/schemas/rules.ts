import { z } from 'zod';

export const SectionIdSchema = z.string().min(1).max(200);

export const EditorNameSchema = z.string().trim().min(1, 'Enter your name').max(40, 'Name is too long');

export const RuleEditSchema = z.object({
  sectionId: SectionIdSchema,
  body: z.string().max(50_000, 'That section is too long'),
  editorName: EditorNameSchema,
  explanation: z
    .string()
    .trim()
    .min(5, 'Explain the edit in a few words')
    .max(500, 'Keep the explanation under 500 characters'),
  /** Number of edits the editor saw, so two people editing at once can't silently overwrite each other. */
  baseEditCount: z.number().int().min(0),
});

export type RuleEditInput = z.infer<typeof RuleEditSchema>;

export interface EditSummary {
  editorName: string;
  explanation: string;
  createdAt: string;
}

export interface RuleSection {
  id: string;
  level: number;
  title: string;
  position: number;
  /** Where the original text came from, e.g. "Base rulebook p. 8". */
  source: string;
  body: string;
  editCount: number;
  lastEdit: EditSummary | null;
}

export interface RuleEdit extends EditSummary {
  id: number;
  sectionId: string;
  sectionTitle: string;
  bodyBefore: string;
  bodyAfter: string;
}
