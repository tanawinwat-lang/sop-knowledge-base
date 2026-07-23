const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_URL = 'postgresql://neondb_owner:npg_9owj3ugvZPTk@ep-snowy-moon-axvo2yi3-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log('✅ Connected to Neon PostgreSQL');

  // Create the db_snapshots table
  await client.query(`
    CREATE TABLE IF NOT EXISTS db_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Table db_snapshots created/verified');

  await client.query('CREATE INDEX IF NOT EXISTS idx_db_updated ON db_snapshots(updated_at DESC);');

  // Generate seed data
  const passwordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();
  const futureExpire = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const pastExpire = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const seedData = {
    users: [
      { id: 1, username: 'admin', email: 'admin@company.com', password_hash: passwordHash, role_id: 1, is_active: true, created_at: now },
      { id: 2, username: 'supervisor', email: 'sup@company.com', password_hash: passwordHash, role_id: 2, is_active: true, created_at: now },
      { id: 3, username: 'agent', email: 'agent@company.com', password_hash: passwordHash, role_id: 3, is_active: true, created_at: now },
    ],
    roles: [
      { id: 1, role_name: 'ADMIN' },
      { id: 2, role_name: 'SUPERVISOR' },
      { id: 3, role_name: 'AGENT' },
    ],
    page_permissions: [
      { id: 1, role_id: 1, page_route: '/dashboard', can_access: true, can_write: true, can_delete: true },
      { id: 2, role_id: 1, page_route: '/sops', can_access: true, can_write: true, can_delete: true },
      { id: 3, role_id: 1, page_route: '/approval', can_access: true, can_write: true, can_delete: true },
      { id: 4, role_id: 1, page_route: '/feedback', can_access: true, can_write: true, can_delete: true },
      { id: 5, role_id: 1, page_route: '/announcements', can_access: true, can_write: true, can_delete: true },
      { id: 6, role_id: 1, page_route: '/settings/users', can_access: true, can_write: true, can_delete: true },
      { id: 7, role_id: 1, page_route: '/settings/permissions', can_access: true, can_write: true, can_delete: true },
      { id: 8, role_id: 1, page_route: '/settings/audit-logs', can_access: true, can_write: true, can_delete: true },
      { id: 9, role_id: 2, page_route: '/dashboard', can_access: true, can_write: true, can_delete: false },
      { id: 10, role_id: 2, page_route: '/sops', can_access: true, can_write: true, can_delete: false },
      { id: 11, role_id: 2, page_route: '/approval', can_access: true, can_write: true, can_delete: false },
      { id: 12, role_id: 2, page_route: '/feedback', can_access: true, can_write: true, can_delete: false },
      { id: 13, role_id: 2, page_route: '/announcements', can_access: true, can_write: true, can_delete: false },
      { id: 14, role_id: 2, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
      { id: 15, role_id: 2, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
      { id: 16, role_id: 2, page_route: '/settings/audit-logs', can_access: true, can_write: false, can_delete: false },
      { id: 17, role_id: 3, page_route: '/dashboard', can_access: true, can_write: false, can_delete: false },
      { id: 18, role_id: 3, page_route: '/sops', can_access: true, can_write: false, can_delete: false },
      { id: 19, role_id: 3, page_route: '/approval', can_access: false, can_write: false, can_delete: false },
      { id: 20, role_id: 3, page_route: '/feedback', can_access: false, can_write: false, can_delete: false },
      { id: 21, role_id: 3, page_route: '/announcements', can_access: true, can_write: false, can_delete: false },
      { id: 22, role_id: 3, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
      { id: 23, role_id: 3, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
      { id: 24, role_id: 3, page_route: '/settings/audit-logs', can_access: false, can_write: false, can_delete: false },
      { id: 25, role_id: 1, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
      { id: 26, role_id: 2, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
      { id: 27, role_id: 3, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
      { id: 28, role_id: 1, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
      { id: 29, role_id: 2, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
      { id: 30, role_id: 3, page_route: '/sops/new', can_access: false, can_write: false, can_delete: false },
      { id: 31, role_id: 1, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: true },
      { id: 32, role_id: 2, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: false },
      { id: 33, role_id: 3, page_route: '/sops/trash', can_access: false, can_write: false, can_delete: false },
      { id: 34, role_id: 1, page_route: '/settings/backups', can_access: true, can_write: true, can_delete: true },
      { id: 35, role_id: 2, page_route: '/settings/backups', can_access: true, can_write: false, can_delete: false },
      { id: 36, role_id: 3, page_route: '/settings/backups', can_access: false, can_write: false, can_delete: false },
    ],
    categories: [
      { id: 1, name: 'ฝ่ายทรัพยากรบุคคล (HR & Welfare)', parent_id: null, allowed_roles: [1, 2, 3] },
      { id: 2, name: 'การยื่นใบลาและสวัสดิการ', parent_id: 1, allowed_roles: [1, 2, 3] },
      { id: 3, name: 'ฝ่ายบริการลูกค้า (Customer Service SOP)', parent_id: null, allowed_roles: [1, 2, 3] },
      { id: 4, name: 'การรับมือข้อร้องเรียนสินค้า', parent_id: 3, allowed_roles: [1, 2, 3] },
      { id: 5, name: 'ฝ่ายบัญชีและข้อมูลลับ (Confidential Finance)', parent_id: null, allowed_roles: [1, 2] },
    ],
    sops: [
      {
        id: 1, category_id: 2,
        title: 'การยื่นใบลาป่วยและการขอใบรับรองแพทย์',
        content: '# การยื่นใบลาป่วยและการขอใบรับรองแพทย์\n\n1. **ขั้นตอนการแจ้งลาป่วย**:\n   - แจ้งหัวหน้างานผ่านระบบ HR-Online หรืออีเมลอย่างน้อย 30 นาทีก่อนเริ่มเวลาทำงาน\n\n2. **สิทธิการลาป่วย**:\n   - พนักงานมีสิทธิลาป่วยได้ตามที่ป่วยจริง โดยได้รับค่าจ้างเท่ากับวันทำงานปกติปีละไม่เกิน 30 วันทำการ\n\n> [!WARNING]\n> การยื่นใบลาเท็จมีโทษทางวินัยร้ายแรงถึงขั้นเลิกจ้างโดยไม่จ่ายชดเชย',
        status: 'PUBLISHED', created_by: 2, updated_by: 2, version: 1,
        tags: ['HR', 'ลาป่วย', 'สวัสดิการ', 'ใบรับรองแพทย์'],
        review_cycle_months: 6, expires_at: futureExpire, last_reviewed_at: now,
        attachments: [], created_at: now, updated_at: now,
      },
      {
        id: 2, category_id: 4,
        title: 'ขั้นตอนการคืนเงินและเปลี่ยนสินค้า (Return & Refund SOP)',
        content: '# ขั้นตอนการคืนเงินและเปลี่ยนสินค้า (Return & Refund SOP)\n\n1. **เงื่อนไขการคืนสินค้า**:\n   - สินค้าต้องอยู่ในสภาพสมบูรณ์ภายใน 14 วันนับจากวันที่ได้รับสินค้า\n\n2. **ขั้นตอนการดำเนินการของ Agent**:\n   - ตรวจสอบประวัติการสั่งซื้อในระบบ CRM\n   - ออกอนุมัติใบรับคืนสินค้า (RMA Code)\n   - เมื่อคลังสินค้าได้รับสินค้าและตรวจสอบแล้ว ระบบจะทำการคืนเงินเข้าบัญชีลูกค้าภายใน 3-5 วันทำการ',
        status: 'PUBLISHED', created_by: 2, updated_by: 1, version: 2,
        tags: ['Customer Service', 'คืนเงิน', 'เปลี่ยนสินค้า', 'RMA'],
        review_cycle_months: 6, expires_at: futureExpire, last_reviewed_at: now,
        attachments: [], created_at: now, updated_at: now,
      },
      {
        id: 3, category_id: 5,
        title: 'คู่มือขั้นตอนการอนุมัติงบประมาณลับและการจ่ายเงินปันผล',
        content: '# คู่มือขั้นตอนการอนุมัติงบประมาณลับและการจ่ายเงินปันผล (Confidential)\n\n1. **สิทธิ์ในการเข้าถึงและอนุมัติ**:\n   - การอนุมัติวงเงินเกิน 500,000 บาท ต้องได้รับการลงนามจาก Director และ Admin เท่านั้น\n\n2. **ขั้นตอนการโอนเงินคู่ค้า**:\n   - ตรวจสอบเอกสารใบแจ้งหนี้ (Invoice) และใบกำกับภาษีเต็มรูปแบบ\n   - ตรวจสอบบัญชีปลายทางว่าตรงกับ Master Data ในระบบการเงิน',
        status: 'PUBLISHED', created_by: 1, updated_by: 1, version: 1,
        tags: ['Finance', 'Confidential', 'งบประมาณ', 'อนุมัติ'],
        review_cycle_months: 12, expires_at: futureExpire, last_reviewed_at: now,
        attachments: [], created_at: now, updated_at: now,
      },
      {
        id: 4, category_id: 1,
        title: 'นโยบายการปฏิบัติงานที่บ้าน (WFH Policy 2025 - รอตารางทบทวน)',
        content: '# นโยบายการปฏิบัติงานที่บ้าน (WFH Policy 2025 - Expired)\n\n1. **การลงเวลาทำงาน**:\n   - พนักงานต้องทำการ Check-in ในแอปพลิเคชันภายในเวลา 09:00 น.\n\n> [!IMPORTANT]\n> เอกสารนี้หมดอายุแล้ว โปรดตรวจสอบฉบับปรับปรุงใหม่ปี 2026',
        status: 'PUBLISHED', created_by: 2, updated_by: 2, version: 1,
        tags: ['WFH', 'HR', 'หมดอายุ'],
        review_cycle_months: 6, expires_at: pastExpire,
        last_reviewed_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        attachments: [], created_at: now, updated_at: now,
      },
    ],
    trash_sops: [],
    audit_logs: [
      { id: 1, user_id: 1, username: 'admin', action: 'CREATE_SOP', target: 'SOP #3', details: 'สร้างเอกสารลับงบประมาณ', ip_address: '127.0.0.1', created_at: now },
      { id: 2, user_id: 2, username: 'supervisor', action: 'APPROVE_SOP', target: 'SOP #2', details: 'อนุมัติ SOP การคืนเงิน', ip_address: '127.0.0.1', created_at: now },
    ],
    feedbacks: [
      { id: 1, sop_id: 4, user_id: 3, is_helpful: false, reason: 'ข้อมูล WFH ในเอกสารนี้เป็นของปี 2025 ปัจจุบันกฎใหม่เริ่มใช้แล้ว อยากให้อัปเดตข้อมูลปี 2026 ด่วนครับ', created_at: now },
      { id: 2, sop_id: 2, user_id: 3, is_helpful: true, created_at: now },
    ],
    announcements: [
      { id: 1, title: '🚀 ยินดีต้อนรับสู่ระบบ SOP Knowledge Base v2.0', content: 'ระบบจัดการระเบียบปฏิบัติมาตรฐานเวอร์ชันใหม่ พร้อมฟีเจอร์ AI Copilot, Hybrid Search, และระบบแจ้งเตือนประกาศข่าวสาร', announcement_type: 'GENERAL', created_by: 1, created_at: now, attachments: [] },
      { id: 2, title: '📢 อัปเดตนโยบาย WFH ปี 2026 กำลังดำเนินการ', content: 'ขณะนี้อยู่ระหว่างการปรับปรุงนโยบาย WFM (Work From Home) ปี 2026 โดยทีม HR โปรดติดตามประกาศเพิ่มเติม', announcement_type: 'URGENT', created_by: 1, created_at: now, attachments: [] },
    ],
    announcement_reads: [],
    announcement_comments: [],
    tag_library: [
      { id: 1, name: 'HR', created_at: now },
      { id: 2, name: 'ลาป่วย', created_at: now },
      { id: 3, name: 'สวัสดิการ', created_at: now },
      { id: 4, name: 'ใบรับรองแพทย์', created_at: now },
      { id: 5, name: 'Customer Service', created_at: now },
      { id: 6, name: 'คืนเงิน', created_at: now },
      { id: 7, name: 'เปลี่ยนสินค้า', created_at: now },
      { id: 8, name: 'RMA', created_at: now },
      { id: 9, name: 'Finance', created_at: now },
      { id: 10, name: 'Confidential', created_at: now },
      { id: 11, name: 'งบประมาณ', created_at: now },
      { id: 12, name: 'อนุมัติ', created_at: now },
      { id: 13, name: 'WFH', created_at: now },
      { id: 14, name: 'หมดอายุ', created_at: now },
    ],
    change_requests: [],
    sop_templates: [
      { id: 1, name: '📋 แม่แบบ SOP อบรมพนักงานใหม่ (Employee Onboarding)', description: 'ใช้สำหรับสร้าง SOP การฝึกอบรมพนักงานใหม่', content: '# ขั้นตอนการอบรมพนักงานใหม่\n\n1. **วัตถุประสงค์**:\n   - เพื่อให้พนักงานใหม่เข้าใจนโยบายและวัฒนธรรมองค์กร\n\n2. **ขั้นตอนการดำเนินงาน**:\n   - [ระบุขั้นตอนที่ 1]\n   - [ระบุขั้นตอนที่ 2]\n\n3. **การประเมินผล**:\n   - ผ่านการทดสอบหลังอบรมด้วยคะแนนไม่น้อยกว่า 80%', category_id: 1, tags: ['HR', 'อบรม', 'Onboarding'], review_cycle_months: 12, created_by: 1, created_at: now },
      { id: 2, name: '📋 แม่แบบ SOP ความปลอดภัย (Safety Procedure)', description: 'ใช้สำหรับสร้าง SOP ด้านความปลอดภัย', content: '# มาตรการความปลอดภัยในการปฏิบัติงาน\n\n1. **อุปกรณ์ป้องกันส่วนบุคคล (PPE)**:\n   - [ระบุอุปกรณ์]\n\n2. **การจัดการเหตุฉุกเฉิน**:\n   - [ระบุขั้นตอนเมื่อเกิดเหตุ]\n\n3. **การรายงานอุบัติเหตุ**:\n   - แจ้งหัวหน้างานทันที', category_id: 1, tags: ['Safety', 'ความปลอดภัย', 'PPE'], review_cycle_months: 6, created_by: 1, created_at: now },
      { id: 3, name: '📋 แม่แบบ SOP การเงิน (Financial Procedure)', description: 'ใช้สำหรับสร้าง SOP ด้านการเงินและการบัญชี', content: '# ขั้นตอนการดำเนินงานด้านการเงิน\n\n1. **อำนาจอนุมัติ**:\n   - วงเงินไม่เกิน [จำนวน] บาท\n\n2. **ขั้นตอนการเบิกจ่าย**:\n   - ยื่นเอกสารใบขออนุมัติ\n   - ตรวจสอบเอกสาร\n\n3. **เอกสารประกอบ**:\n   - ใบแจ้งหนี้ (Invoice)\n   - ใบกำกับภาษี', category_id: 5, tags: ['Finance', 'การเงิน', 'งบประมาณ'], review_cycle_months: 12, created_by: 1, created_at: now },
    ],
    sop_images: [],
  };

  // Upsert the seed data
  await client.query(
    `INSERT INTO db_snapshots (id, snapshot_data, created_at, updated_at)
     VALUES (1, $1::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       snapshot_data = $1::jsonb,
       updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(seedData)]
  );

  console.log('✅ Seed data inserted successfully!');
  console.log('   Users:', seedData.users.length);
  console.log('   SOPs:', seedData.sops.length);
  console.log('   Categories:', seedData.categories.length);
  console.log('   Announcements:', seedData.announcements.length);

  await client.end();
  console.log('\n🚀 Neon PostgreSQL is READY!');
  console.log('   Next: Set DATABASE_URL on Render and Redeploy');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
