# 📋 SOP Knowledge Base — ระบบจัดการระเบียบปฏิบัติมาตรฐาน (Standard Operating Procedure)

ระบบจัดการเอกสาร SOP แบบครบวงจร — รองรับการสร้าง, แก้ไข, อนุมัติ, ค้นหา, และแจ้งเตือน พร้อม AI Assistant

## ✨ ฟังก์ชันหลัก

| ฟังก์ชัน | รายละเอียด |
|---|---|
| 📝 **จัดการ SOP** | สร้าง, แก้ไข, ลบ, หมวดหมู่, แท็ก, ค้นหา |
| ✅ **อนุมัติเอกสาร** | Approval Workflow + Change Request |
| 📢 **ประกาศข่าวสาร** | แจ้งเตือน + คอมเมนต์ + แนบไฟล์/รูป/ลิงก์ |
| 🤖 **AI Assistant** | ค้นหา, วิเคราะห์, แนะนำ SOP |
| 👥 **จัดการผู้ใช้** | RBAC, ตำแหน่ง, สิทธิ์, Active/Inactive |
| 💾 **Backup อัตโนมัติ** | สำรองข้อมูลทุกวัน 22:00 น., เก็บ 7 วัน |
| 🗑️ **ถังขยะ** | กู้คืน SOP ที่ลบภายใน 30 วัน |

---

## 🚀 Deploy บน Oracle Cloud Free Tier (แนะนำ!)

Oracle Cloud Free Tier ให้ **4 CPU, 24GB RAM, 200GB SSD ฟรีตลอดชีพ** — เหมาะสำหรับระบบนี้ที่สุด!

### ขั้นตอนที่ 1: สมัคร Oracle Cloud

1. ไปที่ [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. กด **"Start for free"**
3. กรอกข้อมูลส่วนตัว + **บัตรเครดิต/เดบิต** (เพื่อยืนยันตัวตน — **ไม่คิดเงิน**)
4. ยืนยันอีเมล + เบอร์โทรศัพท์

### ขั้นตอนที่ 2: สร้าง VM Instance

1. เข้า [Oracle Cloud Console](https://cloud.oracle.com)
2. เมนู → **Compute** → **Instances** → **Create Instance**
3. ตั้งค่า:

| หัวข้อ | ค่าที่ตั้ง |
|---|---|
| **Name** | `sop-knowledge-base` |
| **Image** | Canonical Ubuntu 24.04 LTS |
| **Shape** | `VM.Standard.A1.Flex` (Ampere ARM, Free Tier) |
| **OCPUs** | 4 |
| **Memory** | 24 GB |
| **Boot Volume** | 200 GB |

4. **SSH Keys** → เลือก **"Generate a key pair"** → ดาวน์โหลด Private Key (.pem)
5. กด **Create** → รอ ~2 นาที
6. คัดลอก **Public IP Address** ที่ได้

### ขั้นตอนที่ 3: SSH เข้า Server

**Windows (ใช้ Git Bash หรือ PowerShell):**

```bash
# ไปที่โฟลเดอร์ที่มี private key
cd ~/Downloads

# แก้ไข permission (เฉพาะ Git Bash / WSL)
chmod 400 ssh-key-2026-*.key

# SSH
ssh -i ~/Downloads/ssh-key-2026-*.key ubuntu@<PUBLIC_IP>
```

### ขั้นตอนที่ 4: รัน Setup Script อัตโนมัติ! 🎯

เมื่อ SSH เข้า Server แล้ว วางคำสั่งนี้ทีละคำสั่ง:

```bash
# โคลนโปรเจกต์
git clone https://github.com/tanawinwat-lang/sop-knowledge-base.git
cd sop-knowledge-base

# รันสคริปต์ติดตั้ง
chmod +x scripts/setup-vps.sh
bash scripts/setup-vps.sh
```

สคริปต์จะถาม:
1. **Server name** → ใส่ Public IP เช่น `168.xxx.xxx.xxx` หรือ Domain
2. **GitHub Repo** → Enter (ใช้ค่าเริ่มต้น)
3. **JWT Secret** → Enter (สุ่มให้อัตโนมัติ)
4. **SSL Email** → Enter เพื่อข้าม (ใช้ HTTP ก่อน), หรือใส่อีเมลเพื่อ HTTPS

**รอ ~3-5 นาที — เสร็จ!** 🎉

### ✅ หลังติดตั้งเสร็จ

```
🌐 เข้าถึงได้ที่: http://<PUBLIC_IP>/

📝 ข้อมูลเข้าใช้งาน:
   👑 Admin:      admin@company.com / password123
   👔 Supervisor: sup@company.com / password123
   👤 Agent:      agent@company.com / password123
```

### 📋 คำสั่งจัดการ Server

```bash
# ดูสถานะ
pm2 status

# ดู Log แบบ Real-time
pm2 logs sop-knowledge-base

# รีสตาร์ท
pm2 restart sop-knowledge-base

# อัปเดตโค้ดจาก GitHub
cd /var/www/sop-knowledge-base
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart sop-knowledge-base

# สำรองข้อมูลด้วยตนเอง
pm2 kill    # หยุด app ก่อน
cp data/database.json data/backup/manual-backup-$(date +%Y%m%d).json
pm2 start sop-knowledge-base  # เริ่มใหม่
```

---

## 🛠️ การพัฒนาท้องถิ่น (Local Development)

```bash
# ติดตั้ง dependencies
npm install

# สร้างไฟล์ environment
cp .env.example .env.local

# รัน dev server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

---

## 🗄️ ระบบจัดเก็บข้อมูล

| สภาพแวดล้อม | วิธีเก็บข้อมูล |
|---|---|
| **Local Dev / VPS** | `data/database.json` (ไฟล์ JSON ถาวร) |
| Vercel + PostgreSQL | PostgreSQL ผ่าน `lib/db-postgres.ts`| **Render + Neon PostgreSQL** | `database.json` + PostgreSQL (Dual-Write + Auto-Sync ทุก 60s) |
| **Local Dev / VPS** | `data/database.json` (ไฟล์ JSON ถาวร) |

ข้อมูลถูก Sync ไป PostgreSQL อัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง + ทุก 60 วินาที — ปลอดภัยแม้ Container จะถูกรีสตาร์ท!

### Auto Backup
- ทำงานอัตโนมัติทุกวันเวลา **22:00 น.**
- เก็บไฟล์สำรองไว้ **7 วัน**
- Backup อยู่ที่ `data/backup/database-YYYY-MM-DD.json`
- กู้คืนจาก Backup → หน้า **จัดการ Backup** ในระบบ

---

## 🔧 เทคโนโลยีที่ใช้

| เทคโนโลยี | เวอร์ชัน |
|---|---|
| [Next.js](https://nextjs.org) | 16.2.10 |
| [React](https://react.dev) | 19.2.4 |
| [Tailwind CSS](https://tailwindcss.com) | 3.4 |
| [TypeScript](https://www.typescriptlang.org) | 5.x |
| [Lucide Icons](https://lucide.dev) | 1.25 |
| [JWT](https://jwt.io) + bcryptjs | Auth |

---

## 📁 โครงสร้างโปรเจกต์

```
sop-knowledge-base/
├── app/
│   ├── (auth)/login/      # หน้าเข้าสู่ระบบ
│   ├── (dashboard)/       # หน้า Dashboard, SOP, Announcements ฯลฯ
│   ├── api/               # REST API routes
│   └── layout.tsx
├── components/
│   ├── layout/            # Header, Sidebar, NotificationBell
│   ├── sops/              # WYSIWYGEditor, AICopilotSidebar ฯลฯ
│   ├── feedback/          # FeedbackModal
│   └── search/            # SmartSearchBar, AIQuickSummary
├── lib/
│   ├── db.ts              # 📦 ฐานข้อมูลหลัก (database.json)
│   ├── db-postgres.ts     # PostgreSQL adapter (สำหรับ Vercel)
│   ├── auth.ts            # JWT + Authentication
│   ├── rbac.ts            # Role-Based Access Control
│   ├── search.ts          # Hybrid Search
│   └── ai.ts              # AI Assistant
├── data/
│   ├── database.json      # 📄 ฐานข้อมูล (ไฟล์ JSON)
│   └── backup/            # 💾 Auto Backup
├── scripts/
│   └── setup-vps.sh       # 🚀 VPS Setup Script
└── public/uploads/
    └── sops/              # 🖼️ รูปภาพ
```

---

## 🔐 ข้อมูลเข้าใช้งานเริ่มต้น

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| 👑 **Admin** | `admin@company.com` | `password123` |
| 👔 **Supervisor** | `sup@company.com` | `password123` |
| 👤 **Agent** | `agent@company.com` | `password123` |


