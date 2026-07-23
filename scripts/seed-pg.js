/**
 * Seed PostgreSQL with complete initial data
 * Matches getInitialSeedData() from lib/db.ts exactly
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const conn = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_24CAvjmXJrxK@ep-spring-dust-az0rsq67.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const passwordHash = bcrypt.hashSync('password123', 10);
const now = new Date().toISOString();
const futureExpireDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
const pastExpireDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

function generateSimpleEmbedding(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(32).fill(0);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const code = word.charCodeAt(j);
      vec[(i + j + code) % 32] += (code % 10) / 10;
    }
  }
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((v) => v / mag);
}

const sop1Content = `# การยื่นใบลาป่วยและการขอใบรับรองแพทย์

1. **ขั้นตอนการแจ้งลาป่วย**:
   - แจ้งหัวหน้างานผ่านระบบ HR-Online หรืออีเมลอย่างน้อย 30 นาทีก่อนเริ่มเวลาทำงาน
   - ในกรณีลาป่วยติดต่อกันเกิน 2 วันทำการ ต้องแนบใบรับรองแพทย์จากสถานพยาบาลที่ได้รับการรับรอง

2. **สิทธิการลาป่วย**:
   - พนักงานมีสิทธิลาป่วยได้ตามที่ป่วยจริง โดยได้รับค่าจ้างเท่ากับวันทำงานปกติปีละไม่เกิน 30 วันทำการ

> [!WARNING]
> การยื่นใบลาเท็จมีโทษทางวินัยร้ายแรงถึงขั้นเลิกจ้างโดยไม่จ่ายชดเชย`;

const sop2Content = `# ขั้นตอนการคืนเงินและเปลี่ยนสินค้า (Return & Refund SOP)

1. **เงื่อนไขการคืนสินค้า**:
   - สินค้าต้องอยู่ในสภาพสมบูรณ์ภายใน 14 วันนับจากวันที่ได้รับสินค้า
   - ลูกค้าต้องมีใบเสร็จรับเงินหรือหมายเลขคำสั่งซื้อที่ยืนยันได้

2. **ขั้นตอนการดำเนินการของ Agent**:
   - ตรวจสอบประวัติการสั่งซื้อในระบบ CRM
   - ออกอนุมัติใบรับคืนสินค้า (RMA Code) และแจ้งที่อยู่จัดส่งคืนให้แก่ลูกค้า
   - เมื่อคลังสินค้าได้รับสินค้าและตรวจสอบแล้ว ระบบจะทำการคืนเงินเข้าบัญชีลูกค้าภายใน 3-5 วันทำการ`;

const sop3Content = `# คู่มือขั้นตอนการอนุมัติงบประมาณลับและการจ่ายเงินปันผล (Confidential)

1. **สิทธิ์ในการเข้าถึงและอนุมัติ**:
   - การอนุมัติวงเงินเกิน 500,000 บาท ต้องได้รับการลงนามจาก Director และ Admin เท่านั้น
2. **ขั้นตอนการโอนเงินคู่ค้า**:
   - ตรวจสอบเอกสารใบแจ้งหนี้ (Invoice) และใบกำกับภาษีเต็มรูปแบบ
   - ตรวจสอบบัญชีปลายทางว่าตรงกับ Master Data ในระบบการเงิน`;

const sop4Content = `# นโยบายการปฏิบัติงานที่บ้าน (WFH Policy 2025 - Expired)

1. **การลงเวลาทำงาน**:
   - พนักงานต้องทำการ Check-in ในแอปพลิเคชันภายในเวลา 09:00 น.
2. **อุปกรณ์การทำงาน**:
   - การเชื่อมต่อเครือข่ายบริษัทต้องผ่าน VPN ของบริษัทเท่านั้น

> [!IMPORTANT]
> เอกสารนี้หมดอายุแล้ว โปรดตรวจสอบฉบับปรับปรุงใหม่ปี 2026`;

const sops = [
  {
    id: 1, category_id: 2,
    title: 'การยื่นใบลาป่วยและการขอใบรับรองแพทย์',
    content: sop1Content, status: 'PUBLISHED',
    created_by: 2, updated_by: 2, version: 1,
    tags: ['HR', 'ลาป่วย', 'สวัสดิการ', 'ใบรับรองแพทย์'],
    review_cycle_months: 6, expires_at: futureExpireDate, last_reviewed_at: now,
    embedding: generateSimpleEmbedding(sop1Content), attachments: [],
    created_at: now, updated_at: now,
  },
  {
    id: 2, category_id: 4,
    title: 'ขั้นตอนการคืนเงินและเปลี่ยนสินค้า (Return & Refund SOP)',
    content: sop2Content, status: 'PUBLISHED',
    created_by: 2, updated_by: 1, version: 2,
    tags: ['Customer Service', 'คืนเงิน', 'เปลี่ยนสินค้า', 'RMA'],
    review_cycle_months: 6, expires_at: futureExpireDate, last_reviewed_at: now,
    embedding: generateSimpleEmbedding(sop2Content), attachments: [],
    created_at: now, updated_at: now,
  },
  {
    id: 3, category_id: 5,
    title: 'คู่มือขั้นตอนการอนุมัติงบประมาณลับและการจ่ายเงินปันผล',
    content: sop3Content, status: 'PUBLISHED',
    created_by: 1, updated_by: 1, version: 1,
    tags: ['Finance', 'Confidential', 'งบประมาณ', 'อนุมัติ'],
    review_cycle_months: 12, expires_at: futureExpireDate, last_reviewed_at: now,
    embedding: generateSimpleEmbedding(sop3Content), attachments: [],
    created_at: now, updated_at: now,
  },
  {
    id: 4, category_id: 1,
    title: 'นโยบายการปฏิบัติงานที่บ้าน (WFH Policy 2025 - รอตารางทบทวน)',
    content: sop4Content, status: 'PUBLISHED',
    created_by: 2, updated_by: 2, version: 1,
    tags: ['WFH', 'HR', 'หมดอายุ'],
    review_cycle_months: 6, expires_at: pastExpireDate,
    last_reviewed_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    embedding: generateSimpleEmbedding(sop4Content), attachments: [],
    created_at: now, updated_at: now,
  },
];

// Extract unique tags
const allSopTags = new Set();
sops.forEach(s => s.tags.forEach(t => allSopTags.add(t)));
const tagLibrary = Array.from(allSopTags).map((name, idx) => ({
  id: idx + 1, name, created_at: now,
}));

const roles = [
  { id: 1, role_name: 'ADMIN' },
  { id: 2, role_name: 'SUPERVISOR' },
  { id: 3, role_name: 'AGENT' },
];

const users = [
  { id: 1, username: 'admin', email: 'admin@company.com', password_hash: passwordHash, role_id: 1, is_active: true, created_at: now },
  { id: 2, username: 'supervisor', email: 'sup@company.com', password_hash: passwordHash, role_id: 2, is_active: true, created_at: now },
  { id: 3, username: 'agent', email: 'agent@company.com', password_hash: passwordHash, role_id: 3, is_active: true, created_at: now },
];

const page_permissions = [
  // ADMIN (role_id: 1) — full access everything
  { id: 1, role_id: 1, page_route: '/dashboard', can_access: true, can_write: true, can_delete: true },
  { id: 2, role_id: 1, page_route: '/sops', can_access: true, can_write: true, can_delete: true },
  { id: 3, role_id: 1, page_route: '/approval', can_access: true, can_write: true, can_delete: true },
  { id: 4, role_id: 1, page_route: '/feedback', can_access: true, can_write: true, can_delete: true },
  { id: 5, role_id: 1, page_route: '/announcements', can_access: true, can_write: true, can_delete: true },
  { id: 6, role_id: 1, page_route: '/settings/users', can_access: true, can_write: true, can_delete: true },
  { id: 7, role_id: 1, page_route: '/settings/permissions', can_access: true, can_write: true, can_delete: true },
  { id: 8, role_id: 1, page_route: '/settings/audit-logs', can_access: true, can_write: true, can_delete: true },
  // SUPERVISOR (role_id: 2)
  { id: 9, role_id: 2, page_route: '/dashboard', can_access: true, can_write: true, can_delete: false },
  { id: 10, role_id: 2, page_route: '/sops', can_access: true, can_write: true, can_delete: false },
  { id: 11, role_id: 2, page_route: '/approval', can_access: true, can_write: true, can_delete: false },
  { id: 12, role_id: 2, page_route: '/feedback', can_access: true, can_write: true, can_delete: false },
  { id: 13, role_id: 2, page_route: '/announcements', can_access: true, can_write: true, can_delete: false },
  { id: 14, role_id: 2, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
  { id: 15, role_id: 2, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
  { id: 16, role_id: 2, page_route: '/settings/audit-logs', can_access: true, can_write: false, can_delete: false },
  // AGENT (role_id: 3)
  { id: 17, role_id: 3, page_route: '/dashboard', can_access: true, can_write: false, can_delete: false },
  { id: 18, role_id: 3, page_route: '/sops', can_access: true, can_write: false, can_delete: false },
  { id: 19, role_id: 3, page_route: '/approval', can_access: false, can_write: false, can_delete: false },
  { id: 20, role_id: 3, page_route: '/feedback', can_access: false, can_write: false, can_delete: false },
  { id: 21, role_id: 3, page_route: '/announcements', can_access: true, can_write: false, can_delete: false },
  { id: 22, role_id: 3, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
  { id: 23, role_id: 3, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
  { id: 24, role_id: 3, page_route: '/settings/audit-logs', can_access: false, can_write: false, can_delete: false },
  // Password — accessible to all roles
  { id: 25, role_id: 1, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
  { id: 26, role_id: 2, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
  { id: 27, role_id: 3, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
  // SOP New
  { id: 28, role_id: 1, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
  { id: 29, role_id: 2, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
  { id: 30, role_id: 3, page_route: '/sops/new', can_access: false, can_write: false, can_delete: false },
  // SOP Trash
  { id: 31, role_id: 1, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: true },
  { id: 32, role_id: 2, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: false },
  { id: 33, role_id: 3, page_route: '/sops/trash', can_access: false, can_write: false, can_delete: false },
];

const categories = [
  { id: 1, name: 'ฝ่ายทรัพยากรบุคคล (HR & Welfare)', parent_id: null, allowed_roles: [1, 2, 3] },
  { id: 2, name: 'การยื่นใบลาและสวัสดิการ', parent_id: 1, allowed_roles: [1, 2, 3] },
  { id: 3, name: 'ฝ่ายบริการลูกค้า (Customer Service SOP)', parent_id: null, allowed_roles: [1, 2, 3] },
  { id: 4, name: 'การรับมือข้อร้องเรียนสินค้า', parent_id: 3, allowed_roles: [1, 2, 3] },
  { id: 5, name: 'ฝ่ายบัญชีและข้อมูลลับ (Confidential Finance)', parent_id: null, allowed_roles: [1, 2] },
];

const sop_templates = [
  {
    id: 1,
    name: '📋 แม่แบบ SOP อบรมพนักงานใหม่ (Employee Onboarding)',
    description: 'ใช้สำหรับสร้าง SOP การฝึกอบรมพนักงานใหม่ — ประกอบด้วยขั้นตอนการปฐมนิเทศ, การอบรมความปลอดภัย, และการทดสอบ',
    content: `# ขั้นตอนการอบรมพนักงานใหม่\n\n1. **วัตถุประสงค์**:\n   - เพื่อให้พนักงานใหม่เข้าใจนโยบายและวัฒนธรรมองค์กร\n   - เพื่อให้พนักงานใหม่พร้อมปฏิบัติงานภายใน 7 วัน\n\n2. **ขั้นตอนการดำเนินงาน**:\n   - [ระบุขั้นตอนที่ 1]: ...\n   - [ระบุขั้นตอนที่ 2]: ...\n   - [ระบุขั้นตอนที่ 3]: ...\n\n3. **เอกสารอ้างอิง**:\n   - [ระบุเอกสารอ้างอิง]\n\n4. **การประเมินผล**:\n   - ผ่านการทดสอบหลังอบรมด้วยคะแนนไม่น้อยกว่า 80%`,
    category_id: 1,
    tags: ['HR', 'อบรม', 'Onboarding'],
    review_cycle_months: 12,
    created_by: 1,
    created_at: now,
  },
  {
    id: 2,
    name: '📋 แม่แบบ SOP ความปลอดภัย (Safety Procedure)',
    description: 'ใช้สำหรับสร้าง SOP ด้านความปลอดภัย — ครอบคลุมขั้นตอนการป้องกันอุบัติเหตุและการจัดการเหตุฉุกเฉิน',
    content: `# มาตรการความปลอดภัยในการปฏิบัติงาน\n\n1. **วัตถุประสงค์**:\n   - เพื่อป้องกันอุบัติเหตุในการทำงาน\n   - เพื่อให้พนักงานปฏิบัติตามมาตรฐานความปลอดภัย\n\n2. **อุปกรณ์ป้องกันส่วนบุคคล (PPE)**:\n   - [ระบุอุปกรณ์ที่ต้องใช้]: ...\n\n3. **ขั้นตอนการปฏิบัติงานอย่างปลอดภัย**:\n   - [ขั้นตอนที่ 1]: ...\n   - [ขั้นตอนที่ 2]: ...\n\n4. **การจัดการเหตุฉุกเฉิน**:\n   - [ระบุขั้นตอนเมื่อเกิดเหตุ]\n\n5. **การรายงานอุบัติเหตุ**:\n   - แจ้งหัวหน้างานทันทีภายใน [ระบุเวลา] นาที`,
    category_id: 1,
    tags: ['Safety', 'ความปลอดภัย', 'PPE'],
    review_cycle_months: 6,
    created_by: 1,
    created_at: now,
  },
  {
    id: 3,
    name: '📋 แม่แบบ SOP การเงิน (Financial Procedure)',
    description: 'ใช้สำหรับสร้าง SOP ด้านการเงินและการบัญชี — ครอบคลุมขั้นตอนการอนุมัติงบประมาณ, การเบิกจ่าย, และการตรวจสอบ',
    content: `# ขั้นตอนการดำเนินงานด้านการเงิน\n\n1. **วัตถุประสงค์**:\n   - เพื่อควบคุมการใช้จ่ายงบประมาณขององค์กร\n   - เพื่อให้เป็นไปตามมาตรฐานการบัญชี\n\n2. **อำนาจอนุมัติ**:\n   - วงเงินไม่เกิน [จำนวน] บาท: อนุมัติโดย [ตำแหน่ง]\n   - วงเงินเกิน [จำนวน] บาท: อนุมัติโดย [ตำแหน่ง]\n\n3. **ขั้นตอนการเบิกจ่าย**:\n   - [ขั้นตอนที่ 1]: ยื่นเอกสารใบขออนุมัติ\n   - [ขั้นตอนที่ 2]: ตรวจสอบเอกสารโดยแผนกบัญชี\n   - [ขั้นตอนที่ 3]: อนุมัติและดำเนินการโอนเงิน\n\n4. **เอกสารประกอบ**:\n   - ใบแจ้งหนี้ (Invoice)\n   - ใบกำกับภาษีเต็มรูปแบบ\n   - เอกสารอนุมัติ`,
    category_id: 5,
    tags: ['Finance', 'การเงิน', 'งบประมาณ'],
    review_cycle_months: 12,
    created_by: 1,
    created_at: now,
  },
];

const seedData = {
  users, roles, page_permissions, categories, sops,
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
  tag_library: tagLibrary,
  change_requests: [],
  sop_templates,
};

const client = new Client(conn);
async function main() {
  await client.connect();

  // Clear and reseed
  await client.query('TRUNCATE db_snapshots RESTART IDENTITY CASCADE');

  await client.query(
    'INSERT INTO db_snapshots (id, snapshot_data, created_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [1, JSON.stringify(seedData)]
  );

  console.log('✅ PostgreSQL Seeded with COMPLETE data!');
  console.log('');
  console.log('📊 Data Statistics:');
  console.log(`   👤 Users:              ${users.length}`);
  console.log(`   🔐 Roles:              ${roles.length}`);
  console.log(`   📋 Permissions:        ${page_permissions.length}`);
  console.log(`   📁 Categories:          ${categories.length}`);
  console.log(`   📄 SOPs:               ${sops.length}`);
  console.log(`   📢 Announcements:       ${seedData.announcements.length}`);
  console.log(`   🏷️  Tags:              ${tagLibrary.length}`);
  console.log(`   📋 SOP Templates:       ${sop_templates.length}`);
  console.log(`   📝 Audit Logs:          ${seedData.audit_logs.length}`);
  console.log(`   💬 Feedbacks:           ${seedData.feedbacks.length}`);
  console.log('');
  console.log('🔑 Login Credentials:');
  console.log('   ADMIN:     admin@company.com / password123');
  console.log('   SUPERVISOR: sup@company.com / password123');
  console.log('   AGENT:     agent@company.com / password123');

  await client.end();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
