import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: number;
  role_name: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
}

export interface PagePermission {
  id: number;
  role_id: number;
  page_route: string;
  can_access: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  allowed_roles: number[]; // Array of role_ids e.g., [1, 2]
}

export interface SOP {
  id: number;
  category_id: number;
  title: string;
  content: string;
  status: 'DRAFT' | 'PENDING_APPROVE' | 'PUBLISHED';
  created_by: number;
  updated_by: number;
  version: number;
  tags: string[];
  review_cycle_months: number; // e.g., 6 months
  expires_at: string;
  last_reviewed_at: string;
  embedding?: number[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  target: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface Feedback {
  id: number;
  sop_id: number;
  user_id: number;
  is_helpful: boolean;
  reason?: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'link' | 'file';
  name: string;
  url: string;
  mimeType?: string;
  fileSize?: number;
}

export interface TrashSOP {
  sop: SOP;
  deleted_at: string;
  deleted_by: number;
  deleted_by_username: string;
}

export interface TagLibrary {
  id: number;
  name: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: 'GENERAL' | 'SOP_UPDATE' | 'URGENT';
  related_sop_id?: number;
  created_by: number;
  created_at: string;
  attachments: Attachment[];
  target_role_ids?: number[]; // null/[] = all roles, otherwise specific role IDs
}

export interface AnnouncementRead {
  id: number;
  announcement_id: number;
  user_id: number;
  read_at: string;
  acknowledged: boolean;
}

export interface AnnouncementComment {
  id: number;
  announcement_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

export interface ChangeRequest {
  id: number;
  sop_id: number;
  title: string;
  content: string;
  reason: string;
  requested_by: number;
  requested_by_username: string;
  requested_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: number;
  reviewed_at?: string;
  review_comment?: string;
}

export interface SOP_Template {
  id: number;
  name: string;
  description: string;
  content: string;
  category_id: number;
  tags: string[];
  review_cycle_months: number;
  created_by: number;
  created_at: string;
}

export interface DBData {
  users: User[];
  roles: Role[];
  page_permissions: PagePermission[];
  categories: Category[];
  sops: SOP[];
  trash_sops: TrashSOP[];
  audit_logs: AuditLog[];
  feedbacks: Feedback[];
  announcements: Announcement[];
  announcement_reads: AnnouncementRead[];
  announcement_comments: AnnouncementComment[];
  tag_library: TagLibrary[];
  change_requests: ChangeRequest[];
  sop_templates: SOP_Template[];
}

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');
const BACKUP_RETENTION_DAYS = 7;

// Vercel check — when deployed to Vercel, file system is read-only
// Use in-memory storage initialized from seed data
const IS_VERCEL = process.env.VERCEL === '1';

// In-memory cache: avoids redundant file reads within the same request
// On Vercel, persists within a single serverless instance via globalThis
let dbCache: DBData | null = null;

// Export cache clearer for restore operations
export function clearDBCache(): void {
  dbCache = null;
  _maxIdInitialized = false;
}

// ====== Module-level ID Counters: eliminate O(n) Math.max(...map(id)) scans ======
// These are initialized once on first getDB() call and incremented on each creation.
// This dramatically speeds up login/CRUD operations as data grows.
let _maxIdInitialized = false;
let _nextSopId = 0;
let _nextAnnId = 0;
let _nextAuditId = 0;
let _nextCatId = 0;
let _nextTagId = 0;
let _nextFeedbackId = 0;
let _nextPermId = 0;
let _nextChangeRequestId = 0;
let _nextTemplateId = 0;

function initMaxIds(data: DBData) {
  if (_maxIdInitialized) return;
  _nextSopId = data.sops.length ? Math.max(...data.sops.map((s) => s.id)) : 0;
  _nextAnnId = data.announcements.length ? Math.max(...data.announcements.map((a) => a.id)) : 0;
  _nextAuditId = data.audit_logs.length ? Math.max(...data.audit_logs.map((l) => l.id)) : 0;
  _nextCatId = data.categories.length ? Math.max(...data.categories.map((c) => c.id)) : 0;
  _nextTagId = data.tag_library.length ? Math.max(...data.tag_library.map((t) => t.id)) : 0;
  _nextFeedbackId = data.feedbacks.length ? Math.max(...data.feedbacks.map((f) => f.id)) : 0;
  _nextPermId = data.page_permissions.length ? Math.max(...data.page_permissions.map((p) => p.id)) : 0;
  _nextChangeRequestId = data.change_requests.length ? Math.max(...data.change_requests.map((c) => c.id)) : 0;
  _nextTemplateId = data.sop_templates.length ? Math.max(...data.sop_templates.map((t) => t.id)) : 0;
  _maxIdInitialized = true;
}

export function getNextId(type: 'sop' | 'announcement' | 'audit' | 'category' | 'tag' | 'feedback' | 'permission' | 'change_request' | 'sop_template'): number {
  switch (type) {
    case 'sop': return ++_nextSopId;
    case 'announcement': return ++_nextAnnId;
    case 'audit': return ++_nextAuditId;
    case 'category': return ++_nextCatId;
    case 'tag': return ++_nextTagId;
    case 'feedback': return ++_nextFeedbackId;
    case 'permission': return ++_nextPermId;
    case 'change_request': return ++_nextChangeRequestId;
    case 'sop_template': return ++_nextTemplateId;
    default: return 0;
  }
}

function ensureDataDirectory() {
  if (IS_VERCEL) return; // No file system on Vercel
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureBackupDir() {
  if (IS_VERCEL) return;
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function cleanupOldBackups() {
  if (IS_VERCEL) return;
  try {
    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR);
    let deleted = 0;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime.getTime() < cutoff) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(`[Backup] Cleaned up ${deleted} old backup(s)`);
    }
  } catch {
    // Backup cleanup is best-effort
  }
}

export function createBackup() {
  if (IS_VERCEL) return; // No file-based backups on Vercel
  if (!fs.existsSync(DB_FILE)) return;
  ensureBackupDir();
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `database-${timestamp}.json`);
    fs.copyFileSync(DB_FILE, backupPath);
    console.log(`[Backup] Created: database-${timestamp}.json`);
    cleanupOldBackups();
  } catch {
    console.error('[Backup] Failed to create backup');
  }
}

// ====== Scheduled Daily Backup at 22:00 ======
function scheduleDailyBackup() {
  if (IS_VERCEL) return; // No backup scheduling on Vercel
  const now = new Date();
  const target = new Date(now);
  target.setHours(22, 0, 0, 0);
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const msUntilNext = target.getTime() - now.getTime();
  setTimeout(() => {
    console.log('[Backup] Running scheduled daily backup at 22:00...');
    createBackup();
    scheduleDailyBackup();
  }, msUntilNext);
  const hours = Math.floor(msUntilNext / (1000 * 60 * 60));
  const minutes = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));
  console.log(`[Backup] Next scheduled backup in ${hours}h ${minutes}m (at 22:00)`);
}

// Initialize scheduled backup on module load (server start)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge' && !IS_VERCEL) {
  scheduleDailyBackup();
}

// Dummy vector embedding helper generator
export function generateSimpleEmbedding(text: string): number[] {
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

function getInitialSeedData(): DBData {
  const passwordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();
  const futureExpireDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const pastExpireDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const roles: Role[] = [
    { id: 1, role_name: 'ADMIN' },
    { id: 2, role_name: 'SUPERVISOR' },
    { id: 3, role_name: 'AGENT' },
  ];

  const users: User[] = [
    { id: 1, username: 'admin', email: 'admin@company.com', password_hash: passwordHash, role_id: 1, is_active: true, created_at: now },
    { id: 2, username: 'supervisor', email: 'sup@company.com', password_hash: passwordHash, role_id: 2, is_active: true, created_at: now },
    { id: 3, username: 'agent', email: 'agent@company.com', password_hash: passwordHash, role_id: 3, is_active: true, created_at: now },
  ];

  const page_permissions: PagePermission[] = [
    // ADMIN permissions
    { id: 1, role_id: 1, page_route: '/dashboard', can_access: true, can_write: true, can_delete: true },
    { id: 2, role_id: 1, page_route: '/sops', can_access: true, can_write: true, can_delete: true },
    { id: 3, role_id: 1, page_route: '/approval', can_access: true, can_write: true, can_delete: true },
    { id: 4, role_id: 1, page_route: '/feedback', can_access: true, can_write: true, can_delete: true },
    { id: 5, role_id: 1, page_route: '/announcements', can_access: true, can_write: true, can_delete: true },
    { id: 6, role_id: 1, page_route: '/settings/users', can_access: true, can_write: true, can_delete: true },
    { id: 7, role_id: 1, page_route: '/settings/permissions', can_access: true, can_write: true, can_delete: true },
    { id: 8, role_id: 1, page_route: '/settings/audit-logs', can_access: true, can_write: true, can_delete: true },

    // SUPERVISOR permissions
    { id: 9, role_id: 2, page_route: '/dashboard', can_access: true, can_write: true, can_delete: false },
    { id: 10, role_id: 2, page_route: '/sops', can_access: true, can_write: true, can_delete: false },
    { id: 11, role_id: 2, page_route: '/approval', can_access: true, can_write: true, can_delete: false },
    { id: 12, role_id: 2, page_route: '/feedback', can_access: true, can_write: true, can_delete: false },
    { id: 13, role_id: 2, page_route: '/announcements', can_access: true, can_write: true, can_delete: false },
    { id: 14, role_id: 2, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
    { id: 15, role_id: 2, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
    { id: 16, role_id: 2, page_route: '/settings/audit-logs', can_access: true, can_write: false, can_delete: false },

    // AGENT permissions
    { id: 17, role_id: 3, page_route: '/dashboard', can_access: true, can_write: false, can_delete: false },
    { id: 18, role_id: 3, page_route: '/sops', can_access: true, can_write: false, can_delete: false },
    { id: 19, role_id: 3, page_route: '/approval', can_access: false, can_write: false, can_delete: false },
    { id: 20, role_id: 3, page_route: '/feedback', can_access: false, can_write: false, can_delete: false },
    { id: 21, role_id: 3, page_route: '/announcements', can_access: true, can_write: false, can_delete: false },
    { id: 22, role_id: 3, page_route: '/settings/users', can_access: false, can_write: false, can_delete: false },
    { id: 23, role_id: 3, page_route: '/settings/permissions', can_access: false, can_write: false, can_delete: false },
    { id: 24, role_id: 3, page_route: '/settings/audit-logs', can_access: false, can_write: false, can_delete: false },

    // Password settings — accessible to all authenticated roles
    { id: 25, role_id: 1, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
    { id: 26, role_id: 2, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },
    { id: 27, role_id: 3, page_route: '/settings/password', can_access: true, can_write: false, can_delete: false },

    // SOP New — only ADMIN and SUPERVISOR
    { id: 28, role_id: 1, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
    { id: 29, role_id: 2, page_route: '/sops/new', can_access: true, can_write: true, can_delete: false },
    { id: 30, role_id: 3, page_route: '/sops/new', can_access: false, can_write: false, can_delete: false },

    // SOP Trash — only ADMIN and SUPERVISOR
    { id: 31, role_id: 1, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: true },
    { id: 32, role_id: 2, page_route: '/sops/trash', can_access: true, can_write: true, can_delete: false },
    { id: 33, role_id: 3, page_route: '/sops/trash', can_access: false, can_write: false, can_delete: false },
  ];

  const categories: Category[] = [
    { id: 1, name: 'ฝ่ายทรัพยากรบุคคล (HR & Welfare)', parent_id: null, allowed_roles: [1, 2, 3] },
    { id: 2, name: 'การยื่นใบลาและสวัสดิการ', parent_id: 1, allowed_roles: [1, 2, 3] },
    { id: 3, name: 'ฝ่ายบริการลูกค้า (Customer Service SOP)', parent_id: null, allowed_roles: [1, 2, 3] },
    { id: 4, name: 'การรับมือข้อร้องเรียนสินค้า', parent_id: 3, allowed_roles: [1, 2, 3] },
    { id: 5, name: 'ฝ่ายบัญชีและข้อมูลลับ (Confidential Finance)', parent_id: null, allowed_roles: [1, 2] }, // Agent cannot access
  ];

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

  const sops: SOP[] = [
    {
      id: 1,
      category_id: 2,
      title: 'การยื่นใบลาป่วยและการขอใบรับรองแพทย์',
      content: sop1Content,
      status: 'PUBLISHED',
      created_by: 2,
      updated_by: 2,
      version: 1,
      tags: ['HR', 'ลาป่วย', 'สวัสดิการ', 'ใบรับรองแพทย์'],
      review_cycle_months: 6,
      expires_at: futureExpireDate,
      last_reviewed_at: now,
      embedding: generateSimpleEmbedding(sop1Content),
      attachments: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      category_id: 4,
      title: 'ขั้นตอนการคืนเงินและเปลี่ยนสินค้า (Return & Refund SOP)',
      content: sop2Content,
      status: 'PUBLISHED',
      created_by: 2,
      updated_by: 1,
      version: 2,
      tags: ['Customer Service', 'คืนเงิน', 'เปลี่ยนสินค้า', 'RMA'],
      review_cycle_months: 6,
      expires_at: futureExpireDate,
      last_reviewed_at: now,
      embedding: generateSimpleEmbedding(sop2Content),
      attachments: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 3,
      category_id: 5,
      title: 'คู่มือขั้นตอนการอนุมัติงบประมาณลับและการจ่ายเงินปันผล',
      content: sop3Content,
      status: 'PUBLISHED',
      created_by: 1,
      updated_by: 1,
      version: 1,
      tags: ['Finance', 'Confidential', 'งบประมาณ', 'อนุมัติ'],
      review_cycle_months: 12,
      expires_at: futureExpireDate,
      last_reviewed_at: now,
      embedding: generateSimpleEmbedding(sop3Content),
      attachments: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 4,
      category_id: 1,
      title: 'นโยบายการปฏิบัติงานที่บ้าน (WFH Policy 2025 - รอตารางทบทวน)',
      content: sop4Content,
      status: 'PUBLISHED',
      created_by: 2,
      updated_by: 2,
      version: 1,
      tags: ['WFH', 'HR', 'หมดอายุ'],
      review_cycle_months: 6,
      expires_at: pastExpireDate, // Expired!
      last_reviewed_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      embedding: generateSimpleEmbedding(sop4Content),
      attachments: [],
      created_at: now,
      updated_at: now,
    },
  ];

  // Extract unique tags from all SOPs for the tag library
  const allSopTags = new Set<string>();
  sops.forEach((s) => s.tags.forEach((t) => allSopTags.add(t)));
  const tagLibrary: TagLibrary[] = Array.from(allSopTags).map((name, idx) => ({
    id: idx + 1,
    name,
    created_at: now,
  }));

  const audit_logs: AuditLog[] = [
    { id: 1, user_id: 1, username: 'admin', action: 'CREATE_SOP', target: 'SOP #3', details: 'สร้างเอกสารลับงบประมาณ', ip_address: '127.0.0.1', created_at: now },
    { id: 2, user_id: 2, username: 'supervisor', action: 'APPROVE_SOP', target: 'SOP #2', details: 'อนุมัติ SOP การคืนเงิน', ip_address: '127.0.0.1', created_at: now },
  ];

  const feedbacks: Feedback[] = [
    { id: 1, sop_id: 4, user_id: 3, is_helpful: false, reason: 'ข้อมูล WFH ในเอกสารนี้เป็นของปี 2025 ปัจจุบันกฎใหม่เริ่มใช้แล้ว อยากให้อัปเดตข้อมูลปี 2026 ด่วนครับ', created_at: now },
    { id: 2, sop_id: 2, user_id: 3, is_helpful: true, created_at: now },
  ];    const announcements: Announcement[] = [
      {
        id: 1,
        title: '🚀 ยินดีต้อนรับสู่ระบบ SOP Knowledge Base v2.0',
        content: 'ระบบจัดการระเบียบปฏิบัติมาตรฐานเวอร์ชันใหม่ พร้อมฟีเจอร์ AI Copilot, Hybrid Search, และระบบแจ้งเตือนประกาศข่าวสาร',
        announcement_type: 'GENERAL',
        created_by: 1,
        created_at: now,
        attachments: [],
      },
      {
        id: 2,
        title: '📢 อัปเดตนโยบาย WFH ปี 2026 กำลังดำเนินการ',
        content: 'ขณะนี้อยู่ระหว่างการปรับปรุงนโยบาย WFM (Work From Home) ปี 2026 โดยทีม HR โปรดติดตามประกาศเพิ่มเติม',
        announcement_type: 'URGENT',
        created_by: 1,
        created_at: now,
        attachments: [],
      },
    ];

  const announcement_reads: AnnouncementRead[] = [];
  const announcement_comments: AnnouncementComment[] = [];

  const sop_templates: SOP_Template[] = [
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

  return {
    users,
    roles,
    page_permissions,
    categories,
    sops,
    trash_sops: [],
    audit_logs,
    feedbacks,
    announcements,
    announcement_reads,
    announcement_comments,
    tag_library: tagLibrary,
    change_requests: [],
    sop_templates,
  };
}

export function getDB(): DBData {
  // Return cached version if available
  if (dbCache) return dbCache;

  // On Vercel: use in-memory only, initialized from seed data
  if (IS_VERCEL) {
    console.warn('[DB] Running on Vercel — data is ephemeral (in-memory only, seed data)');
    const seed = getInitialSeedData();
    dbCache = seed;
    return seed;
  }

  ensureDataDirectory();
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    dbCache = seed;
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw) as DBData;
    // Backward compatibility: ensure new fields exist
    if (!data.announcements) data.announcements = [];
    if (!data.announcement_reads) data.announcement_reads = [];
    if (!data.announcement_comments) data.announcement_comments = [];
    data.announcements.forEach((a: any) => { if (!a.attachments) a.attachments = []; });
    data.sops.forEach((s: any) => { if (!s.attachments) s.attachments = []; });
    data.users.forEach((u: any) => { if (u.is_active === undefined) u.is_active = true; });
    if (!data.tag_library) data.tag_library = [];
    if (!data.trash_sops) data.trash_sops = [];
    if (!data.change_requests) data.change_requests = [];
    if (!data.sop_templates) data.sop_templates = [];

    // Initialize ID counters after all data migration/repair is complete
    initMaxIds(data);

    // Auto-cleanup: permanently delete trashed SOPs older than 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const beforeTrashCount = data.trash_sops.length;
    data.trash_sops = data.trash_sops.filter(
      (t) => new Date(t.deleted_at).getTime() >= thirtyDaysAgo
    );
    if (data.trash_sops.length !== beforeTrashCount) {
      saveDB(data);
    }

    // Repair corrupted permissions: reset SUPERVISOR and custom roles to correct defaults
    // This fixes data corruption from previous auto-migration bugs
    // ALL_ROUTES is defined at module level
    let needsRepair = false;

    // --- Fix 1: Reset SUPERVISOR permissions to seed defaults ---
    const supSeed: Record<string, { a: boolean; w: boolean; d: boolean }> = {
      '/dashboard': { a: true, w: true, d: false },
      '/sops': { a: true, w: true, d: false },
      '/sops/new': { a: true, w: true, d: false },
      '/sops/trash': { a: true, w: true, d: false },
      '/approval': { a: true, w: true, d: false },
      '/feedback': { a: true, w: true, d: false },
      '/announcements': { a: true, w: true, d: false },
      '/settings/password': { a: true, w: false, d: false },
      '/settings/users': { a: false, w: false, d: false },
      '/settings/permissions': { a: false, w: false, d: false },
      '/settings/backups': { a: true, w: false, d: false },
      '/settings/audit-logs': { a: true, w: false, d: false },
    };
    for (const perm of data.page_permissions) {
      if (perm.role_id === 2) {
        const exp = supSeed[perm.page_route];
        if (exp && (perm.can_access !== exp.a || perm.can_write !== exp.w || perm.can_delete !== exp.d)) {
          perm.can_access = exp.a;
          perm.can_write = exp.w;
          perm.can_delete = exp.d;
          needsRepair = true;
        }
      }
    }

    // --- Fix 2: Only repair custom role (id > 3) permissions that are OBVIOUSLY corrupted ---
    // e.g. can_write=true for a route that shouldn't have write access
    // Don't force-reset everything — respect permissions set via RBAC UI
    for (const perm of data.page_permissions) {
      if (perm.role_id > 3) {
        // Fix 2a: can_write or can_delete is true but can_access is false
        if (!perm.can_access && (perm.can_write || perm.can_delete)) {
          perm.can_write = false;
          perm.can_delete = false;
          needsRepair = true;
        }
        // Fix 2b: can_delete is true when can_write is false (can't delete without write)
        if (!perm.can_write && perm.can_delete) {
          perm.can_delete = false;
          needsRepair = true;
        }
      }
    }

    if (needsRepair) {
      saveDB(data);
    }

    // Check for missing routes and add them (runs every cold start, but only adds if something is missing)
    // ALL_ROUTES is defined at module level
    const existingPairs = new Set(data.page_permissions.map((p) => `${p.page_route}-${p.role_id}`));
    const newPerms: PagePermission[] = [];

    for (const route of ALL_ROUTES) {
      for (const role of data.roles) {
        const roleId = role.id;
        if (!existingPairs.has(`${route}-${roleId}`)) {
          const isAdmin = roleId === 1;
          const isPrivileged = isAdmin || roleId === 2;
          // For custom roles (ids > 3), default to AGENT-level permissions
          const isCustom = roleId > 3;
          const permId = getNextId('permission');
          let canAccess = true, canWrite = false, canDelete = false;

          if (route === '/settings/users' || route === '/settings/permissions') {
            canAccess = isAdmin; canWrite = isAdmin; canDelete = isAdmin;
          } else if (route === '/settings/audit-logs') {
            canAccess = isPrivileged;
          } else if (route === '/sops/new' || route === '/sops/trash') {
            canAccess = isPrivileged; canWrite = isPrivileged;
            if (route === '/sops/trash') canDelete = isAdmin;
          } else if (route === '/approval' || route === '/feedback') {
            canAccess = isPrivileged; canWrite = isPrivileged;
          } else if (route === '/announcements') {
            canAccess = true; canWrite = isPrivileged;
          } else if (route === '/settings/password') {
            canAccess = true;
          } else {
            canAccess = true; canWrite = isPrivileged; canDelete = isAdmin;
          }

          // For custom roles, use AGENT-level defaults (can_access only for basic routes)
          if (isCustom) {
            const basicRoutes = ['/dashboard', '/sops', '/announcements', '/settings/password'];
            canAccess = basicRoutes.includes(route);
            canWrite = false;
            canDelete = false;
          }

          newPerms.push({ id: permId, role_id: roleId, page_route: route, can_access: canAccess, can_write: canWrite, can_delete: canDelete });
        }
      }
    }

    if (newPerms.length > 0) {
      data.page_permissions.push(...newPerms);
      saveDB(data);
    }

    dbCache = data;
    return data;
  } catch {
    const seed = getInitialSeedData();
    if (!IS_VERCEL) {
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    }
    return seed;
  }
}

// All pages/routes in the system — used by both repair and auto-migration
const ALL_ROUTES = ['/dashboard', '/sops', '/sops/new', '/sops/trash', '/approval', '/feedback', '/announcements', '/settings/password', '/settings/users', '/settings/permissions', '/settings/backups', '/settings/audit-logs'];

export function saveDB(data: DBData): void {
  if (!IS_VERCEL) {
    ensureDataDirectory();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
  dbCache = data; // Update cache (always, even on Vercel)
}

export function logAudit(userId: number, username: string, action: string, target: string, details: string, ip: string = '127.0.0.1') {
  const db = getDB();
  const newLog: AuditLog = {
    id: getNextId('audit'),
    user_id: userId,
    username,
    action,
    target,
    details,
    ip_address: ip,
    created_at: new Date().toISOString(),
  };
  db.audit_logs.unshift(newLog);
  saveDB(db);
}
