import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // prisma generate needs env to resolve, but doesn't connect — fallback for Docker build
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
  },
});
