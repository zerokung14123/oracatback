# Oracat Manager

Static web app สำหรับจัดการงาน Oracat Studio

## Purpose

โฟลเดอร์นี้ใช้สำหรับ upload ขึ้น host/domain จริงเท่านั้น

ใช้ไฟล์ config นี้:

```txt
js/config.js
```

คู่มือ:

```txt
setup/hosting/README.md
```

## Netlify Deploy

ตั้งค่า Netlify แบบ static hosting:

```txt
Build command: เว้นว่าง
Publish directory: .
```

ไฟล์ `netlify.toml` กำหนด publish directory ไว้ที่ root ของโปรเจกต์แล้ว และไฟล์ `_headers` ต้องอยู่ที่ root เพื่อให้ Netlify ใช้ security headers ตอน deploy

## สำคัญ

- อย่าใส่ Google OAuth Client Secret หรือ Firebase service account ลงใน frontend
- `js/config.js` ใช้กับ host เท่านั้น
