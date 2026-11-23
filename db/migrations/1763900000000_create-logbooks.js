/**
 * Private Atreides treachery-card logbooks. Anyone with the (long, random) id can read and edit.
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('logbooks', {
    id: { type: 'varchar(24)', primaryKey: true },
    name: { type: 'varchar(80)', notNull: true },
    factions: { type: 'text[]', notNull: true },
    game_id: { type: 'varchar(16)', references: 'games', onDelete: 'SET NULL' },
    state: { type: 'jsonb', notNull: true },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('logbooks');
};
