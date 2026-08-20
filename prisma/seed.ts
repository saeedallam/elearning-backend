import { PrismaClient, Role, CourseLevel, CourseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash, firstName: 'System', lastName: 'Admin', role: Role.ADMIN },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    update: {},
    create: { email: 'instructor@example.com', passwordHash, firstName: 'Jane', lastName: 'Instructor', role: Role.INSTRUCTOR },
  });

  await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: { email: 'student@example.com', passwordHash, firstName: 'John', lastName: 'Student', role: Role.STUDENT },
  });

  const backend = await prisma.category.upsert({
    where: { slug: 'backend-development' },
    update: {},
    create: { name: 'Backend Development', slug: 'backend-development' },
  });

  const course = await prisma.course.upsert({
    where: { slug: 'nestjs-fundamentals' },
    update: {},
    create: {
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      description: 'Learn how to build maintainable backend services with NestJS.',
      level: CourseLevel.BEGINNER,
      price: 0,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      instructorId: instructor.id,
      categoryId: backend.id,
    },
  });

  const section = await prisma.section.upsert({
    where: { courseId_position: { courseId: course.id, position: 1 } },
    update: {},
    create: { courseId: course.id, title: 'Getting Started', position: 1 },
  });

  await prisma.lesson.upsert({
    where: { sectionId_position: { sectionId: section.id, position: 1 } },
    update: {},
    create: {
      sectionId: section.id,
      title: 'Introduction to NestJS',
      description: 'Architecture, modules, controllers and providers.',
      position: 1,
      durationSec: 900,
      isPreview: true,
    },
  });

  console.log('Seed complete:', { admin: admin.email, instructor: instructor.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
