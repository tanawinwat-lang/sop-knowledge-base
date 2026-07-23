#!/bin/bash
# ================================================================
# SOP Knowledge Base — Oracle Cloud Free Tier VPS Setup Script
# ================================================================
# รันด้วย: bash scripts/setup-vps.sh
# รองรับ: Ubuntu 22.04 / 24.04 (ARM Ampere A1)
# ================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 SOP Knowledge Base — VPS Setup             ║"
echo "║   Oracle Cloud Free Tier | Ubuntu 22.04/24.04   ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---------------------------------------------------------------
# Step 1: Get user inputs
# ---------------------------------------------------------------
echo -e "${YELLOW}📝 กรุณากรอกข้อมูลต่อไปนี้:${NC}"

# Domain/IP
read -p "🔗 Domain name หรือ Public IP ของ VPS (เช่น 168.xxx.xxx.xxx หรือ sop.example.com): " SERVER_NAME
if [ -z "$SERVER_NAME" ]; then
    echo -e "${RED}❌ ต้องระบุ Domain หรือ IP${NC}"
    exit 1
fi

# Detect if input is IP or domain
if [[ "$SERVER_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    IS_IP=true
    echo -e "${YELLOW}   ⚠️ ตรวจพบ IP Address — SSL (HTTPS) จะไม่สามารถใช้งานได้${NC}"
    echo -e "${YELLOW}   💡 ถ้าต้องการ HTTPS ให้ใช้ Domain Name แล้วติดตั้ง SSL ทีหลัง${NC}"
else
    IS_IP=false
fi

# GitHub repo
read -p "📦 GitHub Repo URL (Enter = https://github.com/tanawinwat-lang/sop-knowledge-base): " REPO_URL
REPO_URL=${REPO_URL:-https://github.com/tanawinwat-lang/sop-knowledge-base}

# JWT Secret
read -p "🔑 JWT Secret (Enter = auto-generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "sop-knowledge-base-secret-key-$(date +%s)")
fi

# SSL email (only if domain, not IP)
SSL_EMAIL=""
if [ "$IS_IP" = false ]; then
    read -p "📧 Email สำหรับ SSL (Let's Encrypt) — กด Enter เพื่อข้าม: " SSL_EMAIL
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ข้อมูลที่ได้รับ:${NC}"
echo "   Server: $SERVER_NAME"
echo "   Repo: $REPO_URL"
echo "   SSL: $([ -z "$SSL_EMAIL" ] && echo "ไม่ใช้ (HTTP)" || echo "ใช้ (HTTPS)")"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---------------------------------------------------------------
# Step 2: System Update & Dependencies
# ---------------------------------------------------------------
echo -e "${YELLOW}[1/8] 🔄 อัปเดตระบบและติดตั้ง dependencies...${NC}"

sudo apt update -qq
sudo apt upgrade -y -qq
sudo apt install -y -qq curl git nginx certbot python3-certbot-nginx ufw

echo -e "${GREEN}   ✅ System updated${NC}"

# ---------------------------------------------------------------
# Step 3: Install Node.js 20
# ---------------------------------------------------------------
echo -e "${YELLOW}[2/8] 📦 ติดตั้ง Node.js 20 LTS...${NC}"

if command -v node &> /dev/null && node -v | grep -q "v20"; then
    echo -e "${GREEN}   ✅ Node.js $(node -v) already installed${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y -qq nodejs
    echo -e "${GREEN}   ✅ Node.js $(node -v) installed${NC}"
fi

# ---------------------------------------------------------------
# Step 4: Clone / Pull Repository
# ---------------------------------------------------------------
echo -e "${YELLOW}[3/8] 📂 โคลนโปรเจกต์จาก GitHub...${NC}"

APP_DIR="/var/www/sop-knowledge-base"

if [ -d "$APP_DIR/.git" ]; then
    echo "   ⏩ มีโฟลเดอร์แล้ว — ดึงการอัปเดตล่าสุด..."
    cd "$APP_DIR"
    sudo git pull origin main 2>/dev/null || echo "   ⚠️ Git pull failed, continuing..."
else
    sudo mkdir -p /var/www
    sudo git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
sudo chown -R ubuntu:ubuntu "$APP_DIR" 2>/dev/null || sudo chown -R $USER:$USER "$APP_DIR"

echo -e "${GREEN}   ✅ Repository ready${NC}"

# ---------------------------------------------------------------
# Step 5: Create Environment File & Directories
# ---------------------------------------------------------------
echo -e "${YELLOW}[4/8] 🔧 สร้างไฟล์ .env.local...${NC}"

if [ -f .env.local ]; then
    echo "   ⏩ .env.local มีอยู่แล้ว — ข้าม"
else
    cat > .env.local << EOF
JWT_SECRET=${JWT_SECRET}
EOF
    echo -e "${GREEN}   ✅ .env.local created${NC}"
fi

# Create upload and backup directories
mkdir -p public/uploads/sops
mkdir -p data/backup

echo -e "${GREEN}   ✅ Directories ready${NC}"

# ---------------------------------------------------------------
# Step 6: Install Dependencies & Build
# ---------------------------------------------------------------
echo -e "${YELLOW}[5/8] 🏗️ ติดตั้ง dependencies และ Build...${NC}"
echo "   ⏳ npm install (อาจใช้เวลา 1-2 นาที)..."

npm install --legacy-peer-deps 2>&1 | tail -5

echo "   ⏳ npm run build (อาจใช้เวลา 2-3 นาที)..."

# Rebuild native modules for ARM architecture
npm rebuild 2>/dev/null || true

npm run build 2>&1 | tail -10

echo -e "${GREEN}   ✅ Build complete${NC}"

# ---------------------------------------------------------------
# Step 7: Install PM2 & Run App
# ---------------------------------------------------------------
echo -e "${YELLOW}[6/8] ⚙️ ติดตั้ง PM2 และรันแอปพลิเคชัน...${NC}"

sudo npm install -g pm2 2>&1 | tail -2

# Stop existing if running
pm2 delete sop-knowledge-base 2>/dev/null || true

# Start with PM2
pm2 start npm --name sop-knowledge-base -- start -- -p 3000
pm2 save

# Enable PM2 startup (auto-restart on reboot)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | tail -3

# Install PM2 log rotation (prevents logs from filling disk)
pm2 install pm2-logrotate 2>&1 | tail -1
pm2 set pm2-logrotate:max_size 100M 2>&1 | tail -1
pm2 set pm2-logrotate:retain 7 2>&1 | tail -1

echo -e "${GREEN}   ✅ PM2 running on port 3000${NC}"

# ---------------------------------------------------------------
# Step 8: Configure Nginx
# ---------------------------------------------------------------
echo -e "${YELLOW}[7/8] 🌐 ตั้งค่า Nginx Reverse Proxy...${NC}"

NGINX_CONF="/etc/nginx/sites-available/sop-knowledge-base"

cat | sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 100M;
}
EOF

# Replace _ placeholder with actual server name
sudo sed -i "s/server_name _;/server_name ${SERVER_NAME};/" "$NGINX_CONF"

# Enable site
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

echo -e "${GREEN}   ✅ Nginx configured${NC}"

# ---------------------------------------------------------------
# Step 9: Configure Firewall (UFW)
# ---------------------------------------------------------------
echo -e "${YELLOW}[8/8] 🔥 ตั้งค่า Firewall...${NC}"

sudo ufw --force reset 2>/dev/null || true
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo -e "${GREEN}   ✅ Firewall configured${NC}"

# ---------------------------------------------------------------
# Step 10: SSL Certificate (optional, domain only)
# ---------------------------------------------------------------
if [ "$IS_IP" = false ] && [ -n "$SSL_EMAIL" ]; then
    echo -e "${YELLOW}[เพิ่มเติม] 🔒 ตั้งค่า SSL ด้วย Let's Encrypt...${NC}"

    sudo systemctl reload nginx

    if sudo certbot --nginx -d "$SERVER_NAME" --non-interactive --agree-tos -m "$SSL_EMAIL" 2>&1; then
        # Auto-renew cron
        (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet") | crontab -
        echo -e "${GREEN}   ✅ SSL enabled${NC}"
    else
        echo -e "${YELLOW}   ⚠️ SSL setup failed — ระบบยังทำงานผ่าน HTTP ได้ปกติ${NC}"
        echo -e "${YELLOW}   💡 ลองใหม่ทีหลัง: sudo certbot --nginx -d ${SERVER_NAME}${NC}"
    fi
fi

# Restart Nginx to apply final config
sudo systemctl restart nginx
sudo systemctl enable nginx

# ---------------------------------------------------------------
# Done!
# ---------------------------------------------------------------
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "$SERVER_NAME")

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✅ SETUP COMPLETE!                             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 เข้าถึงระบบได้ที่:${NC}"
echo "   http://${SERVER_NAME}/"
if [ "$IS_IP" = false ] && [ -n "$SSL_EMAIL" ]; then
    echo "   https://${SERVER_NAME}/"
fi
echo ""
echo -e "${GREEN}📝 ข้อมูลเข้าใช้งาน (Seed Data):${NC}"
echo "   👑 Admin:      admin@company.com / password123"
echo "   👔 Supervisor: sup@company.com / password123"
echo "   👤 Agent:      agent@company.com / password123"
echo ""
echo -e "${GREEN}📂 Path ที่สำคัญ:${NC}"
echo "   แอป:          ${APP_DIR}"
echo "   database.json: ${APP_DIR}/data/database.json"
echo "   รูปภาพ:       ${APP_DIR}/public/uploads/"
echo "   Backup:       ${APP_DIR}/data/backup/"
echo "   Logs:         pm2 logs sop-knowledge-base"
echo ""
echo -e "${YELLOW}📋 คำสั่งจัดการ:${NC}"
echo "   ดูสถานะ:       pm2 status"
echo "   ดู Log:        pm2 logs sop-knowledge-base"
echo "   รีสตาร์ท:      pm2 restart sop-knowledge-base"
echo "   หยุด:          pm2 stop sop-knowledge-base"
echo "   อัปเดต:"
echo "     cd ${APP_DIR}"
echo "     git pull origin main"
echo "     npm install --legacy-peer-deps"
echo "     npm run build"
echo "     pm2 restart sop-knowledge-base"
echo ""
if [ "$IS_IP" = true ]; then
    echo -e "${YELLOW}🔧 ถ้าต้องการเปิด HTTPS (SSL) ทีหลัง:${NC}"
    echo "   1. ซื้อ Domain และตั้งค่า DNS → IP: ${PUBLIC_IP}"
    echo "   2. รัน: sudo certbot --nginx -d yourdomain.com"
    echo ""
fi
