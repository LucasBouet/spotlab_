import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./prisma_db/index.js";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.log(
      "ADMIN_EMAIL non défini, aucun compte promu. Exemple : ADMIN_EMAIL=you@example.com",
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.log(
      `Aucun compte trouvé pour ${adminEmail}. Créez le compte via /register puis relancez le seed.`,
    );
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${adminEmail} est maintenant administrateur.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
