import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.NODE_ENV === "test" ? process.env.TEST_DB : process.env.DEV_DB;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Ensure .env files are configured correctly.");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Use middleware to log query execution time
if (process.env.NODE_ENV === "development") {
  prisma.$use(async (params, next) => {
    const { model, action, args } = params;
    const start = Date.now();
    const result = await next(params);
    const end = Date.now();

    console.log(`[Prisma] ${model}.${action}(${JSON.stringify(args)}) took ${end - start}ms`);
    return result;
  });
}

export default prisma;
