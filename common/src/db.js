import pg from 'pg';
const { Pool } = pg;
let pool = null;
export function initDb(config) {
    pool = new Pool(config);
}
export function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return pool;
}
function convertNamedParams(sql, params) {
    const values = [];
    let paramIndex = 1;
    const paramMap = new Map();
    const text = sql.replace(/:(\w+)/g, (_, paramName) => {
        if (!paramMap.has(paramName)) {
            paramMap.set(paramName, paramIndex++);
            values.push(params[paramName]);
        }
        return `$${paramMap.get(paramName)}`;
    });
    return { text, values };
}
export async function query(sql, params = {}) {
    const pool = getPool();
    const { text, values } = convertNamedParams(sql, params);
    const result = await pool.query(text, values);
    return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
    };
}
export async function get(sql, mapper, params = {}) {
    const result = await query(sql, params);
    return result.rows.map(mapper);
}
export async function getOne(sql, mapper, params = {}) {
    const results = await get(sql, mapper, params);
    return results[0] ?? null;
}
export async function execute(sql, params = {}) {
    const result = await query(sql, params);
    return result.rowCount;
}
export async function closeDb() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=db.js.map