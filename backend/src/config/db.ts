import * as mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const parseDatabaseUrl = (databaseUrl: string) => {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname || "localhost",
    user: url.username || "root",
    password: url.password || "2004",
    database: url.pathname?.slice(1) || "planentrix",
    port: Number(url.port) || 3306,
  };
};

const dbConfig = process.env.DATABASE_URL
  ? parseDatabaseUrl(process.env.DATABASE_URL)
  : {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "2004",
      database: process.env.DB_NAME || "planentrix",
      port: Number(process.env.DB_PORT) || 3306,
    };

const db = mysql.createPool(dbConfig);

export default db;
