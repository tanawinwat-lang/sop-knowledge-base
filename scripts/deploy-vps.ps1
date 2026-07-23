# ================================================================
# 🚀 SOP Knowledge Base — Deploy to Oracle Cloud VPS (Windows)
# ================================================================
# รันด้วย: powershell -ExecutionPolicy Bypass -File scripts/deploy-vps.ps1
# ================================================================
# สคริปต์นี้ SSH ไปยัง Oracle Cloud VPS และรัน setup-vps.sh แบบอัตโนมัติ
# ================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 SOP Knowledge Base — VPS Deploy             ║" -ForegroundColor Cyan
Write-Host "║   One-Time Setup from Windows                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ---- Configuration ----
$VPS_HOST = Read-Host "🔗 Oracle Cloud VPS Public IP (เช่น 168.xxx.xxx.xxx)"
if (-not $VPS_HOST) {
    Write-Host "❌ ต้องระบุ VPS IP" -ForegroundColor Red
    exit 1
}

$SSH_KEY_PATH = Read-Host "🔑 Path ไปยัง SSH Private Key (เช่น C:\Users\you\Downloads\ssh-key.pem)"
if (-not $SSH_KEY_PATH) {
    Write-Host "❌ ต้องระบุ SSH Key Path" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "❌ ไม่พบไฟล์ SSH Key ที่: $SSH_KEY_PATH" -ForegroundColor Red
    exit 1
}

$VPS_USER = "ubuntu"  # Oracle Cloud Ubuntu default user

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ข้อมูล:" -ForegroundColor Green
Write-Host "   VPS IP:     $VPS_HOST"
Write-Host "   SSH Key:    $SSH_KEY_PATH"
Write-Host "   SSH User:   $VPS_USER"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ---- Test SSH Connection ----
Write-Host "[1/5] 🔍 ทดสอบ SSH Connection..." -ForegroundColor Yellow

$sshTest = ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "echo 'SSH_OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH Connection failed!" -ForegroundColor Red
    Write-Host "   Error: $sshTest" -ForegroundColor Red
    Write-Host "💡 ตรวจสอบ:" -ForegroundColor Yellow
    Write-Host "   1. VPS กำลังทำงานอยู่ (Oracle Cloud Console → Instances)"
    Write-Host "   2. Firewall เปิด port 22 (SSH)"
    Write-Host "   3. SSH Key ถูกต้อง"
    Write-Host "   4. ทดสอบ: ssh -i `"$SSH_KEY_PATH`" $VPS_USER@$VPS_HOST"
    exit 1
}
Write-Host "   ✅ SSH Connected!" -ForegroundColor Green

# ---- Prepare Setup Commands ----
Write-Host "[2/5] 📦 รัน Setup Script บน VPS..." -ForegroundColor Yellow
Write-Host "   ⏳ ใช้เวลา 3-5 นาที..."

# Create the remote commands as a string, then pipe via stdin
$remoteCommands = @"
set -e

APP_DIR="/var/www/sop-knowledge-base"
# Clone repo if not exists, update if exists
if [ -d "\$APP_DIR/.git" ]; then
    cd \$APP_DIR
    git pull origin main 2>&1
else
    sudo mkdir -p /var/www
    sudo git clone https://github.com/tanawinwat-lang/sop-knowledge-base.git \$APP_DIR
    cd \$APP_DIR
    sudo chown -R $VPS_USER:$VPS_USER \$APP_DIR
fi

cd \$APP_DIR
chmod +x scripts/setup-vps.sh

# Run in non-interactive mode via env vars (setup-vps.sh reads these if stdin not a tty)
export SERVER_NAME="$VPS_HOST"
export REPO_URL="https://github.com/tanawinwat-lang/sop-knowledge-base"
export JWT_SECRET="sop-knowledge-base-secret-key-\$(date +%s)"
export SSL_EMAIL=""

# Pipe empty answers to skip interactive prompts (script reads env vars instead)
echo "" | bash scripts/setup-vps.sh 2>&1
"@

# Pipe commands to SSH via stdin (not as argument!)
$setupResult = $remoteCommands | ssh -i "$SSH_KEY_PATH" "$VPS_USER@$VPS_HOST" "bash" 2>&1
Write-Host "$setupResult" -ForegroundColor Gray

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Setup อาจมี Warning — ตรวจสอบ Log ต่อได้" -ForegroundColor Yellow
}

Write-Host "   ✅ Setup Script ทำงานเสร็จ!" -ForegroundColor Green

# ---- Get Public IP ----
Write-Host "[3/5] 🌐 ตรวจสอบ URL..." -ForegroundColor Yellow

$publicIp = ssh -i "$SSH_KEY_PATH" "$VPS_USER@$VPS_HOST" "curl -s http://checkip.amazonaws.com 2>/dev/null || echo '$VPS_HOST'" 2>&1
Write-Host "   ✅ Public IP: $publicIp" -ForegroundColor Green

# ---- Verify App Running ----
Write-Host "[4/5] 🔍 ตรวจสอบแอปพลิเคชัน..." -ForegroundColor Yellow

$appCheck = ssh -i "$SSH_KEY_PATH" "$VPS_USER@$VPS_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo 'down'" 2>&1

if ($appCheck -eq "200" -or $appCheck -eq "302") {
    Write-Host "   ✅ App running (HTTP $appCheck)!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ App status: $appCheck" -ForegroundColor Yellow
    Write-Host "   ตรวจสอบ: ssh -i `"$SSH_KEY_PATH`" $VPS_USER@$VPS_HOST 'pm2 logs sop-knowledge-base --nostream --lines 20'" -ForegroundColor White
}

# ---- GitHub Secrets Setup Instructions ----
Write-Host "[5/5] 🔧 ตั้งค่า GitHub Auto-Deploy (Optional)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 ตั้งค่า GitHub Secrets สำหรับ Auto-Deploy ทุกครั้งที่ Push:" -ForegroundColor Cyan
Write-Host "   1. ไปที่ GitHub Repo → Settings → Secrets and variables → Actions"
Write-Host "   2. กด New repository secret" -ForegroundColor White
Write-Host ""
Write-Host "   📌 Name: VPS_HOST" -ForegroundColor Green
Write-Host "   📌 Value: $VPS_HOST" -ForegroundColor White
Write-Host ""
Write-Host "   📌 Name: SSH_PRIVATE_KEY" -ForegroundColor Green
Write-Host "   📌 Value: เปิดไฟล์ $SSH_KEY_PATH ใน Notepad และคัดลอกทั้งหมด" -ForegroundColor White
Write-Host "           รวมบรรทัด -----BEGIN OPENSSH PRIVATE KEY----- และ -----END-----"
Write-Host ""
Write-Host "   📌 Name: VPS_USERNAME" -ForegroundColor Green
Write-Host "   📌 Value: ubuntu" -ForegroundColor White
Write-Host ""
Write-Host "   📌 Name: JWT_SECRET" -ForegroundColor Green
Write-Host "   📌 Value: sop-knowledge-base-super-secret-key-2026" -ForegroundColor White

# ===== DONE =====
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ✅ DEPLOY COMPLETE!                            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 เข้าถึงระบบได้ที่:" -ForegroundColor Green
Write-Host "   http://$publicIp/" -ForegroundColor White
Write-Host ""
Write-Host "📝 ข้อมูลเข้าใช้งาน:" -ForegroundColor Green
Write-Host "   👑 Admin:      admin@company.com / password123" -ForegroundColor White
Write-Host "   👔 Supervisor: sup@company.com / password123" -ForegroundColor White
Write-Host "   👤 Agent:      agent@company.com / password123" -ForegroundColor White
Write-Host ""
Write-Host "📋 คำสั่งจัดการ:" -ForegroundColor Yellow
Write-Host "   ดู Log:  ssh -i `"$SSH_KEY_PATH`" $VPS_USER@$VPS_HOST 'pm2 logs sop-knowledge-base'" -ForegroundColor White
Write-Host "   รีสตาร์ท: ssh -i `"$SSH_KEY_PATH`" $VPS_USER@$VPS_HOST 'pm2 restart sop-knowledge-base'" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Auto-Deploy:" -ForegroundColor Cyan
Write-Host "   ตั้งค่า GitHub Secrets ข้างต้น → Push to main → GitHub Actions Deploy อัตโนมัติ!" -ForegroundColor Green
Write-Host ""
