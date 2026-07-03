import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/prisma_db/schema.prisma",
  datasource: {
    url: "file:./dev.db",
  },
});
