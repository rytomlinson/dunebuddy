/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('games', {
    id: { type: 'varchar(16)', primaryKey: true },
    name: { type: 'varchar(80)', notNull: true },
    game_date: { type: 'date', notNull: true },
    votes_per_player: { type: 'integer', notNull: true, default: 2 },
    factions: { type: 'text[]', notNull: true },
    status: { type: 'varchar(16)', notNull: true, default: 'open' },
    result: { type: 'jsonb' },
    reset_history: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.addConstraint('games', 'games_status_check', "CHECK (status IN ('open', 'calculated'))");
  pgm.createIndex('games', 'game_date');

  pgm.createTable('ballots', {
    id: { type: 'serial', primaryKey: true },
    game_id: { type: 'varchar(16)', notNull: true, references: 'games', onDelete: 'CASCADE' },
    player_name: { type: 'varchar(40)', notNull: true },
    votes: { type: 'jsonb', notNull: true },
    edit_token: { type: 'varchar(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.sql('CREATE UNIQUE INDEX ballots_game_player_unique ON ballots (game_id, lower(player_name))');
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('ballots');
  pgm.dropTable('games');
};
