/**
 * The rules knowledge base. Section text is imported from the rulebooks (not stored in git);
 * every change after that is an edit row, kept forever.
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('rule_sections', {
    id: { type: 'varchar(200)', primaryKey: true },
    level: { type: 'smallint', notNull: true },
    title: { type: 'varchar(200)', notNull: true },
    position: { type: 'integer', notNull: true },
    source: { type: 'varchar(200)', notNull: true, default: '' },
    original_body: { type: 'text', notNull: true },
    body: { type: 'text', notNull: true },
    edit_count: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('rule_sections', 'position');

  pgm.createTable('rule_edits', {
    id: { type: 'serial', primaryKey: true },
    section_id: { type: 'varchar(200)', notNull: true, references: 'rule_sections', onDelete: 'RESTRICT' },
    editor_name: { type: 'varchar(40)', notNull: true },
    explanation: { type: 'varchar(500)', notNull: true },
    body_before: { type: 'text', notNull: true },
    body_after: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('rule_edits', ['section_id', 'created_at']);
  pgm.createIndex('rule_edits', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('rule_edits');
  pgm.dropTable('rule_sections');
};
