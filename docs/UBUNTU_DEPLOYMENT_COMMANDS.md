# Hướng dẫn triển khai HIS L2 API trên Ubuntu

Tài liệu này tổng hợp các lệnh cần thiết để cài đặt và vận hành HIS L2 API trên Ubuntu. Thay các giá trị viết hoa như `VPS_IP`, `GITHUB_USERNAME` và `API_KEY_THAT` bằng giá trị thực tế.

> Không đưa mật khẩu HIS, API key, SSH private key hoặc file `/etc/his-l2-api.env` lên GitHub hay ảnh chụp màn hình.

## 1. SSH vào VPS bằng tài khoản root

Chạy trên PowerShell hoặc Git Bash của Windows:

```bash
ssh root@VPS_IP
```

Ví dụ:

```bash
ssh root@103.163.119.181
```

Kiểm tra tài khoản và hệ điều hành sau khi đăng nhập:

```bash
whoami
cat /etc/os-release
uname -m
```

- `whoami`: hiển thị tài khoản đang sử dụng.
- `cat /etc/os-release`: hiển thị phiên bản Ubuntu.
- `uname -m`: hiển thị kiến trúc CPU, thường là `x86_64`.

Đổi mật khẩu root:

```bash
passwd
```

## 2. Cập nhật Ubuntu và cài công cụ cơ bản

```bash
apt update
apt upgrade -y
```

- `apt update`: cập nhật danh sách gói phần mềm.
- `apt upgrade -y`: nâng cấp các gói đã cài và tự động xác nhận.

Đặt múi giờ Việt Nam:

```bash
timedatectl set-timezone Asia/Ho_Chi_Minh
timedatectl
```

Cài công cụ cần thiết:

```bash
apt install -y curl git nginx ufw ca-certificates build-essential
```

## 3. Tạo tài khoản triển khai và cấu hình firewall

Tạo tài khoản `deploy`:

```bash
adduser deploy
usermod -aG sudo deploy
```

- `adduser`: tạo người dùng mới.
- `usermod -aG sudo`: thêm người dùng vào nhóm có quyền quản trị.

Cho phép SSH, HTTP và HTTPS trước khi bật firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Không mở port `8090` ra Internet. Node.js chỉ lắng nghe trên `127.0.0.1:8090`, còn Nginx tiếp nhận kết nối ở port 80 và 443.

## 4. Cài Node.js 22

```bash
cd /tmp
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt install -y nodejs
```

Kiểm tra phiên bản:

```bash
node --version
npm --version
which node
```

- `node --version`: phiên bản Node.js, yêu cầu từ Node.js 18 trở lên.
- `npm --version`: phiên bản npm.
- `which node`: đường dẫn chương trình Node.js, thường là `/usr/bin/node`.

## 5. Tạo swap cho VPS 1 GB RAM

Kiểm tra swap hiện tại:

```bash
swapon --show
free -h
```

Chỉ chạy các lệnh sau nếu máy chưa có swap:

```bash
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

- `fallocate`: tạo file swap dung lượng 1 GB.
- `chmod 600`: chỉ root được đọc và ghi file swap.
- `mkswap`: định dạng file thành vùng swap.
- `swapon`: bật swap ngay lập tức.
- `/etc/fstab`: tự động bật swap sau khi khởi động lại.

## 6. Tạo deploy key và tải source từ GitHub

Chuyển sang tài khoản `deploy`:

```bash
su - deploy
```

Tạo SSH key dùng riêng cho GitHub:

```bash
ssh-keygen -t ed25519 -C "deploy-his-l2-api" -f ~/.ssh/id_ed25519
```

Nhấn Enter hai lần để bỏ trống passphrase nếu VPS cần tự động `git pull`.

Hiển thị public key để thêm vào GitHub **Settings > Deploy keys**:

```bash
cat ~/.ssh/id_ed25519.pub
```

Không bao giờ hiển thị hoặc chia sẻ private key `~/.ssh/id_ed25519`.

Kiểm tra kết nối GitHub sau khi thêm deploy key:

```bash
ssh -T git@github.com
```

Tải source:

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github.com:GITHUB_USERNAME/his-l2-api.git
cd ~/apps/his-l2-api
git status
```

Chạy kiểm thử:

```bash
node --test
```

Project hiện không có dependency ngoài nên không bắt buộc chạy `npm install`. Khi repository có `package-lock.json`, cài dependency bằng:

```bash
npm ci
```

## 7. Tạo API key và cấu hình production

Tạo API key khi đang ở tài khoản `deploy`:

```bash
node -e "console.log('hisl2_live_' + require('crypto').randomBytes(32).toString('base64url'))"
```

Lưu API key vào trình quản lý mật khẩu, sau đó trở lại tài khoản root:

```bash
exit
```

Tạo file biến môi trường:

```bash
nano /etc/his-l2-api.env
```

Nội dung mẫu:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=8090

API_KEYS="API_KEY_THAT"

HIS_REQUEST_TIMEOUT_MS=60000
HIS_TLS_VERIFY=true
HIS_ALLOWED_DOMAIN_SUFFIXES=".vncare.vn"
HIS_CONNECTION_TTL_MS=28800000
HIS_CONNECTION_IDLE_MS=7200000
HIS_CONNECTION_MAX_ATTEMPTS=5
```

Trong `nano`, nhấn `Ctrl+O`, Enter để lưu và `Ctrl+X` để thoát.

Giới hạn quyền đọc file:

```bash
chown root:deploy /etc/his-l2-api.env
chmod 640 /etc/his-l2-api.env
ls -l /etc/his-l2-api.env
```

Không dùng `cat /etc/his-l2-api.env` khi đang quay màn hình hoặc chụp ảnh.

## 8. Chạy ứng dụng bằng systemd

Tạo service:

```bash
nano /etc/systemd/system/his-l2-api.service
```

Nội dung:

```ini
[Unit]
Description=HIS L2 API Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/apps/his-l2-api
EnvironmentFile=/etc/his-l2-api.env
ExecStart=/usr/bin/node /home/deploy/apps/his-l2-api/src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Đọc lại cấu hình và khởi động service:

```bash
systemctl daemon-reload
systemctl enable --now his-l2-api
systemctl status his-l2-api --no-pager
```

Kiểm tra API nội bộ và port:

```bash
curl http://127.0.0.1:8090/api/health
ss -lntp | grep 8090
```

Port đúng phải là `127.0.0.1:8090`, không phải `0.0.0.0:8090`.

## 9. Cấu hình DNS và Nginx

Trên DuckDNS, trỏ tên miền `hisl2-vpc.duckdns.org` tới IP public của VPS. Kiểm tra trên Windows:

```bash
nslookup hisl2-vpc.duckdns.org
```

Trên VPS, tạo cấu hình Nginx:

```bash
nano /etc/nginx/sites-available/his-l2-api
```

Nội dung:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name hisl2-vpc.duckdns.org;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 15s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

Kích hoạt website và kiểm tra cấu hình:

```bash
ln -s /etc/nginx/sites-available/his-l2-api /etc/nginx/sites-enabled/his-l2-api
nginx -t
systemctl reload nginx
systemctl status nginx --no-pager
```

Kiểm tra HTTP:

```bash
curl -I http://hisl2-vpc.duckdns.org
```

## 10. Bật HTTPS bằng Certbot

Chỉ thực hiện khi DNS đã trỏ đúng và HTTP truy cập được:

```bash
snap install core
snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/local/bin/certbot
certbot --nginx -d hisl2-vpc.duckdns.org
```

Kiểm tra tự động gia hạn chứng chỉ:

```bash
certbot renew --dry-run
```

Kiểm tra HTTPS:

```bash
curl -I https://hisl2-vpc.duckdns.org
```

## 11. Cập nhật source, khởi động và theo dõi log

Lấy phiên bản mới nhất từ GitHub:

```bash
sudo -u deploy git -C /home/deploy/apps/his-l2-api pull --ff-only
```

Nếu có `package-lock.json`, cài đúng phiên bản dependency:

```bash
sudo -u deploy npm --prefix /home/deploy/apps/his-l2-api ci
```

Chạy test trước khi restart:

```bash
cd /home/deploy/apps/his-l2-api
sudo -u deploy node --test
```

Quản lý service:

```bash
systemctl start his-l2-api
systemctl stop his-l2-api
systemctl restart his-l2-api
systemctl status his-l2-api --no-pager
```

Xem 100 dòng log gần nhất:

```bash
journalctl -u his-l2-api -n 100 --no-pager
```

Theo dõi log trực tiếp, nhấn `Ctrl+C` để thoát:

```bash
journalctl -u his-l2-api -f
```

Xem log từ một khoảng thời gian:

```bash
journalctl -u his-l2-api --since "1 hour ago" --no-pager
```

Khởi động lại VPS khi thật sự cần thiết:

```bash
reboot
```

## Bảng tổng hợp lệnh Ubuntu/Linux

| Lệnh | Giải thích |
|---|---|
| `pwd` | Hiển thị thư mục hiện tại. |
| `ls -la` | Liệt kê đầy đủ file, gồm cả file ẩn và quyền truy cập. |
| `cd /duong/dan` | Chuyển tới một thư mục. |
| `cd ~` | Chuyển về thư mục home của người dùng hiện tại. |
| `mkdir -p thu_muc` | Tạo thư mục và các thư mục cha còn thiếu. |
| `cp nguon dich` | Sao chép file hoặc thư mục. |
| `mv nguon dich` | Di chuyển hoặc đổi tên file. |
| `nano file` | Mở file bằng trình soạn thảo Nano. |
| `cat file` | In nội dung file; không dùng với file chứa bí mật khi chia sẻ màn hình. |
| `less file` | Đọc file dài theo từng trang; nhấn `q` để thoát. |
| `whoami` | Hiển thị người dùng hiện tại. |
| `id` | Hiển thị UID và các nhóm của người dùng. |
| `sudo lenh` | Chạy một lệnh với quyền quản trị. |
| `su - deploy` | Chuyển sang người dùng `deploy`. |
| `chmod 640 file` | Đặt quyền đọc/ghi cho chủ sở hữu và quyền đọc cho nhóm. |
| `chown root:deploy file` | Đổi chủ sở hữu thành `root` và nhóm thành `deploy`. |
| `apt update` | Cập nhật danh sách package. |
| `apt upgrade -y` | Nâng cấp package đã cài. |
| `apt install -y ten_goi` | Cài package. |
| `apt remove ten_goi` | Gỡ package. |
| `df -h` | Kiểm tra dung lượng ổ đĩa. |
| `free -h` | Kiểm tra RAM và swap. |
| `top` | Theo dõi CPU, RAM và process trực tiếp. |
| `ps aux` | Liệt kê các process đang chạy. |
| `ss -lntp` | Liệt kê các TCP port đang lắng nghe. |
| `curl URL` | Gửi HTTP request và hiển thị response. |
| `curl -I URL` | Chỉ lấy HTTP response headers. |
| `systemctl status SERVICE` | Kiểm tra trạng thái service. |
| `systemctl restart SERVICE` | Khởi động lại service. |
| `systemctl enable SERVICE` | Cho service tự chạy khi Ubuntu khởi động. |
| `journalctl -u SERVICE -f` | Theo dõi log trực tiếp của service. |
| `nginx -t` | Kiểm tra cú pháp cấu hình Nginx. |
| `ufw status` | Kiểm tra trạng thái firewall. |
| `git clone URL` | Tải repository lần đầu. |
| `git status` | Kiểm tra nhánh và file thay đổi. |
| `git pull --ff-only` | Lấy code mới và không tự tạo merge commit. |
| `node --test` | Chạy toàn bộ Node.js test. |
| `Ctrl+C` | Dừng lệnh đang chạy hoặc thoát chế độ theo dõi log. |
| `exit` | Thoát người dùng hiện tại hoặc đóng phiên SSH. |

## Quy trình cập nhật code hằng ngày

Trên máy Windows:

```bash
git status
git add .
git commit -m "Mo ta thay doi"
git push
```

Trên VPS:

```bash
sudo -u deploy git -C /home/deploy/apps/his-l2-api pull --ff-only
cd /home/deploy/apps/his-l2-api
sudo -u deploy node --test
systemctl restart his-l2-api
systemctl status his-l2-api --no-pager
```
