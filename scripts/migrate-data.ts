import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

const mysqlConfig = {
  host: 'data.analyze.kr',
  port: 3306,
  user: 'jjcorkr',
  password: 'Xkrcksdn!@01',
  database: 'jjcorkr',
};

const prisma = new PrismaClient();

async function migrate() {
  console.log('Connecting to MySQL...');
  const mysqlConnection = await mysql.createConnection(mysqlConfig);
  console.log('Connected to MySQL');

  try {
    // Migrate Students
    console.log('\n--- Migrating Students ---');
    const [students] = await mysqlConnection.execute('SELECT * FROM Student');
    console.log(`Found ${(students as any[]).length} students`);

    for (const student of students as any[]) {
      await prisma.student.create({
        data: {
          id: student.id,
          name: student.name,
          username: student.username,
          password: student.password,
          birthDate: student.birthDate,
          birthYear: student.birthYear,
          className: student.className,
          teacher: student.teacher,
          phone: student.phone,
          address: student.address,
          photoUrl: student.photoUrl,
          notes: student.notes,
          talents: student.talents,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
      });
    }
    console.log('Students migrated successfully');

    // Migrate Teachers
    console.log('\n--- Migrating Teachers ---');
    const [teachers] = await mysqlConnection.execute('SELECT * FROM Teacher');
    console.log(`Found ${(teachers as any[]).length} teachers`);

    for (const teacher of teachers as any[]) {
      await prisma.teacher.create({
        data: {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username,
          password: teacher.password,
          className: teacher.className,
          phone: teacher.phone,
          email: teacher.email,
          talents: teacher.talents,
          createdAt: teacher.createdAt,
          updatedAt: teacher.updatedAt,
        },
      });
    }
    console.log('Teachers migrated successfully');

    // Migrate Admins
    console.log('\n--- Migrating Admins ---');
    const [admins] = await mysqlConnection.execute('SELECT * FROM Admin');
    console.log(`Found ${(admins as any[]).length} admins`);

    for (const admin of admins as any[]) {
      await prisma.admin.create({
        data: {
          id: admin.id,
          username: admin.username,
          password: admin.password,
          name: admin.name,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      });
    }
    console.log('Admins migrated successfully');

    // Migrate Attendance
    console.log('\n--- Migrating Attendance ---');
    const [attendance] = await mysqlConnection.execute('SELECT * FROM Attendance');
    console.log(`Found ${(attendance as any[]).length} attendance records`);

    for (const record of attendance as any[]) {
      await prisma.attendance.create({
        data: {
          id: record.id,
          date: record.date,
          status: record.status,
          studentId: record.studentId,
          comment: record.comment,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    }
    console.log('Attendance migrated successfully');

    // Migrate TalentHistory
    console.log('\n--- Migrating TalentHistory ---');
    const [talentHistory] = await mysqlConnection.execute('SELECT * FROM TalentHistory');
    console.log(`Found ${(talentHistory as any[]).length} talent history records`);

    for (const record of talentHistory as any[]) {
      await prisma.talentHistory.create({
        data: {
          id: record.id,
          studentId: record.studentId,
          amount: record.amount,
          beforeBalance: record.beforeBalance,
          afterBalance: record.afterBalance,
          reason: record.reason,
          type: record.type,
          createdAt: record.createdAt,
        },
      });
    }
    console.log('TalentHistory migrated successfully');

    // Migrate TeacherTalentHistory
    console.log('\n--- Migrating TeacherTalentHistory ---');
    const [teacherTalentHistory] = await mysqlConnection.execute('SELECT * FROM TeacherTalentHistory');
    console.log(`Found ${(teacherTalentHistory as any[]).length} teacher talent history records`);

    for (const record of teacherTalentHistory as any[]) {
      await prisma.teacherTalentHistory.create({
        data: {
          id: record.id,
          teacherId: record.teacherId,
          amount: record.amount,
          beforeBalance: record.beforeBalance,
          afterBalance: record.afterBalance,
          reason: record.reason,
          type: record.type,
          createdAt: record.createdAt,
        },
      });
    }
    console.log('TeacherTalentHistory migrated successfully');

    // Migrate Products
    console.log('\n--- Migrating Products ---');
    const [products] = await mysqlConnection.execute('SELECT * FROM Product');
    console.log(`Found ${(products as any[]).length} products`);

    for (const product of products as any[]) {
      await prisma.product.create({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          imageUrl: product.imageUrl,
          stock: product.stock,
          isAvailable: product.isAvailable === 1 || product.isAvailable === true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      });
    }
    console.log('Products migrated successfully');

    // Migrate Purchases
    console.log('\n--- Migrating Purchases ---');
    const [purchases] = await mysqlConnection.execute('SELECT * FROM Purchase');
    console.log(`Found ${(purchases as any[]).length} purchases`);

    for (const purchase of purchases as any[]) {
      await prisma.purchase.create({
        data: {
          id: purchase.id,
          studentId: purchase.studentId,
          productId: purchase.productId,
          quantity: purchase.quantity,
          totalPrice: purchase.totalPrice,
          requirements: purchase.requirements,
          status: purchase.status,
          createdAt: purchase.createdAt,
        },
      });
    }
    console.log('Purchases migrated successfully');

    // Migrate SmsHistory
    console.log('\n--- Migrating SmsHistory ---');
    const [smsHistory] = await mysqlConnection.execute('SELECT * FROM SmsHistory');
    console.log(`Found ${(smsHistory as any[]).length} SMS history records`);

    for (const sms of smsHistory as any[]) {
      await prisma.smsHistory.create({
        data: {
          id: sms.id,
          recipients: sms.recipients,
          title: sms.title,
          content: sms.content,
          msgType: sms.msgType,
          requestNo: sms.requestNo,
          status: sms.status,
          sentAt: sms.sentAt,
        },
      });
    }
    console.log('SmsHistory migrated successfully');

    // Migrate WeeklyActivity
    console.log('\n--- Migrating WeeklyActivity ---');
    const [weeklyActivities] = await mysqlConnection.execute('SELECT * FROM WeeklyActivity');
    console.log(`Found ${(weeklyActivities as any[]).length} weekly activity records`);

    for (const activity of weeklyActivities as any[]) {
      await prisma.weeklyActivity.create({
        data: {
          id: activity.id,
          studentId: activity.studentId,
          date: activity.date,
          bible: activity.bible === 1 || activity.bible === true,
          recitation: activity.recitation === 1 || activity.recitation === true,
          qt: activity.qt === 1 || activity.qt === true,
          phone: activity.phone === 1 || activity.phone === true,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        },
      });
    }
    console.log('WeeklyActivity migrated successfully');

    // Reset sequences for PostgreSQL
    console.log('\n--- Resetting PostgreSQL sequences ---');
    const tables = ['Student', 'Teacher', 'Admin', 'Attendance', 'TalentHistory',
                    'TeacherTalentHistory', 'Product', 'Purchase', 'SmsHistory', 'WeeklyActivity'];

    for (const table of tables) {
      const maxIdResult = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${table}"`);
      const maxId = (maxIdResult as any[])[0]?.max_id || 0;
      if (maxId > 0) {
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH ${maxId + 1}`);
        console.log(`Reset sequence for ${table} to ${maxId + 1}`);
      }
    }

    console.log('\n=== Migration completed successfully! ===');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await mysqlConnection.end();
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);
