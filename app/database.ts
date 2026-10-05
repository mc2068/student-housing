import { type Db, LOCAL_DATABASE, openSqlite } from "../db/db";

let db: Db | undefined;

/** The local database a collection run fills (`npm run collect`). The site only reads it. */
export function database(): Db {
  return (db ??= openSqlite(LOCAL_DATABASE, { readOnly: true }));
}
