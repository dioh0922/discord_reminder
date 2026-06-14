import { Kysely, MysqlDialect } from 'kysely'
import mysql from 'mysql2'
import * as dotenv from 'dotenv'
import path from 'path'
const __dirname = path.resolve();
dotenv.config({ path: path.resolve(__dirname, '../env/.env') })
export interface DB {
  moviedata: MovieDataTable;
  travel_todo: TravelDataTable;
}

export interface MovieDataTable {
  id: number;
  title: string;
  date: Date;
}

export interface TravelDataTable {
  distination: string;
  is_done: number;
  is_deleted: number;
}

export const db = new Kysely<DB>({
  dialect: new MysqlDialect({
    pool: mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      user: process.env.DB_USER ?? 'user',
      password: process.env.DB_PASS ?? 'pass',
      database: process.env.DB_DB ?? 'mydb',
      port: Number(process.env.DB_PORT ?? 3306),
      connectionLimit: 10,
    })
  })
});
