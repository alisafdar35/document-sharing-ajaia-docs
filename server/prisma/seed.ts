import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USERS = [
  { name: 'Ali Safdar', email: 'ali@example.com' },
  { name: 'Sarah Johnson', email: 'sarah@example.com' },
  { name: 'John Smith', email: 'john@example.com' },
];

/** A small TipTap document so a fresh install has something to look at. */
const welcomeDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Ajaia Docs' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is a ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'rich-text' },
        { type: 'text', text: ' document. Try making text ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
        { type: 'text', text: ' or ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'underlined' },
        { type: 'text', text: ' - everything is saved automatically.' },
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What you can do' }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Create and rename documents' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Import a .txt or .md file' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Share a document with another user and edit it together' }] }] },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Use the user switcher in the top-right corner to see the app as Sarah or John.' },
      ],
    },
  ],
};

async function main() {
  const users = [];
  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name },
      create: demoUser,
    });
    users.push(user);
    console.log(`  seeded user  ${user.name} <${user.email}>`);
  }

  const [ali] = users;
  const existingWelcome = await prisma.document.findFirst({
    where: { ownerId: ali.id, title: 'Welcome to Ajaia Docs' },
  });

  if (!existingWelcome) {
    await prisma.document.create({
      data: {
        title: 'Welcome to Ajaia Docs',
        content: JSON.stringify(welcomeDoc),
        ownerId: ali.id,
      },
    });
    console.log('  seeded document  "Welcome to Ajaia Docs" (owned by Ali Safdar)');
  } else {
    console.log('  welcome document already present, skipping');
  }
}

main()
  .then(() => console.log('[seed] done'))
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
