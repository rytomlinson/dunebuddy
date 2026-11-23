import pg from 'pg';
export interface DbConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
export declare function initDb(config: DbConfig): void;
export declare function getPool(): pg.Pool;
export interface QueryResult<T> {
    rows: T[];
    rowCount: number;
}
export declare function query<T>(sql: string, params?: Record<string, unknown>): Promise<QueryResult<T>>;
export declare function get<T, R>(sql: string, mapper: (row: T) => R, params?: Record<string, unknown>): Promise<R[]>;
export declare function getOne<T, R>(sql: string, mapper: (row: T) => R, params?: Record<string, unknown>): Promise<R | null>;
export declare function execute(sql: string, params?: Record<string, unknown>): Promise<number>;
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=db.d.ts.map