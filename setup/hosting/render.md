# วิธีติดตั้ง Oracat Manager บน Render

โปรเจกต์นี้มี `render.yaml` และ `server/render-server.mjs` แล้ว ให้ deploy เป็น Render Web Service เพื่อให้ static app และ API `/api/public-config`, `/api/google-oauth` ทำงานใน service เดียวกัน

## 1. เตรียม GitHub

ใช้ repo:

```txt
https://github.com/zerokung14123/oracat.git
```

ให้ push โค้ดล่าสุดขึ้น branch `main` ก่อนสร้าง service บน Render

## 2. สร้าง service จาก Render Blueprint

1. เข้า Render Dashboard
2. เลือก `New` > `Blueprint`
3. เลือก repo `zerokung14123/oracat`
4. Render จะอ่านไฟล์ `render.yaml`
5. ตั้งค่า environment variables ที่ขึ้นว่า `sync: false`
6. กด Apply

ค่าหลักใน blueprint:

```txt
Service type: Web Service
Environment: Node
Build command: npm install && npm run build
Start command: npm start
```

## 3. Environment Variables ที่ต้องใส่

ใส่ใน Render > Service > Environment

```txt
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_SHEET_ID=
GOOGLE_SHEET_NAME=Jobs
GOOGLE_CALENDAR_ID=primary
FIREBASE_CONFIG_JSON=
FIREBASE_APP_CHECK_SITE_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
ALLOWED_ORIGINS=
```

`FIREBASE_CONFIG_JSON` คือ Firebase Web config แบบ JSON เช่น:

```json
{"apiKey":"","authDomain":"","projectId":"","storageBucket":"","messagingSenderId":"","appId":""}
```

`FIREBASE_SERVICE_ACCOUNT_JSON` คือ Firebase Admin service account JSON ทั้งก้อน ให้ใส่เป็น secret ใน Render เท่านั้น ห้าม commit ลง repo

`ALLOWED_ORIGINS` ใส่ URL ของ Render และ custom domain คั่นด้วย comma เช่น:

```txt
https://oracat-manager.onrender.com,https://your-domain.com
```

## 4. ตั้งค่า Google และ Firebase หลัง deploy

หลัง Render deploy สำเร็จ ให้เอา URL จริงไปเพิ่มที่:

- Firebase Authentication > Settings > Authorized domains
- Google Cloud Console > OAuth Client > Authorized JavaScript origins

ถ้าใช้ Google OAuth code flow ให้ redirect origin ต้องตรงกับ domain ที่เปิดเว็บจริง เช่น:

```txt
https://oracat-manager.onrender.com
```

## 5. ตรวจหลัง deploy

เปิด URL ของ Render แล้วตรวจ:

```txt
/manifest.webmanifest
/service-worker.js
/api/public-config
```

`/api/public-config` ต้องตอบ JSON และมีค่า `GOOGLE_OAUTH_CLIENT_ID` ถ้าตั้งค่า env ถูกต้อง

## 6. หมายเหตุความปลอดภัย

- ห้าม commit `.env`, `service-account.json`, หรือ Firebase Admin private key ลง GitHub
- Render server บล็อกไฟล์ backend, `service-account*.json`, `.env*`, `node_modules`, และ package metadata จาก public path
- ถ้าเปลี่ยน domain ต้องอัปเดต `ALLOWED_ORIGINS`, Firebase Authorized domains และ Google OAuth origins ให้ตรงกัน
