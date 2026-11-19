import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });

const CATEGORIES: Array<{ name: string; synonyms: string[] }> = [
  { name: 'Cricket Bat', synonyms: ['cricket bat', 'bat'] },
  { name: 'Baseball Bat', synonyms: ['baseball bat'] },
  { name: 'Badminton Racket', synonyms: ['badminton racket', 'racket', 'racquet'] },
  { name: 'Laptop', synonyms: ['laptop', 'notebook computer'] },
  { name: 'Camera', synonyms: ['camera', 'dslr'] },
  { name: 'Lecture Notes', synonyms: ['notes', 'lecture notes', 'class notes'] },
  { name: 'Study Guide', synonyms: ['study guide', 'exam prep guide'] },
];

async function main() {
  for (const { name, synonyms } of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    for (const term of synonyms) {
      await prisma.categorySynonym.upsert({
        where: { term_categoryId: { term, categoryId: category.id } },
        update: {},
        create: { term, categoryId: category.id },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
