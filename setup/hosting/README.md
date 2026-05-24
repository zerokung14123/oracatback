# Hosting Setup

คู่มือนี้ใช้เฉพาะเว็บที่เปิดผ่าน domain จริง

## ไฟล์ Config

ใส่ Firebase Web config ในไฟล์นี้เท่านั้น:

```txt
js/config.js
```

ใช้ template ในโฟลเดอร์นี้ได้:

```txt
setup/hosting/config.template.js
```

## Firebase Project

1. เข้า `https://console.firebase.google.com/`
2. สร้าง Firebase project สำหรับ host
3. ไปที่ `Project settings -> General`
4. เพิ่ม Web App
5. Copy Firebase SDK config มาใส่ใน `js/config.js`

## Firebase Authentication

1. ไปที่ `Authentication -> Sign-in method`
2. เปิด provider `Google`
3. เลือก support email
4. กด Save

เพิ่มเฉพาะ domain จริงใน Authorized domains:

```txt
your-site.netlify.app
www.yourdomain.com
yourdomain.com
```

## Firestore

1. ไปที่ `Firestore Database`
2. กด `Create database`
3. เลือก `Production mode`
4. สร้าง database
5. ไปที่แท็บ `Rules`
6. วาง rules นี้แล้วกด `Publish`

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

## Google Cloud APIs

ใช้ Google Cloud project เดียวกับ Firebase host project

Enable:

```txt
Google Sheets API
Google Calendar API
```

## OAuth Consent Screen

ตั้งค่าที่:

```txt
Google Cloud Console -> APIs & Services -> OAuth consent screen
```

App domain:

```txt
Application home page: https://your-site.netlify.app/
Application privacy policy link: https://your-site.netlify.app/privacy.html
Application terms of service link: https://your-site.netlify.app/terms.html
```

Scopes:

```txt
openid
email
profile
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/calendar
```

ถ้าอยู่ใน Testing mode ให้เพิ่มอีเมลผู้ใช้งานจริงใน `Test users`

## OAuth Redirect

ไปที่:

```txt
Google Cloud Console -> APIs & Services -> Credentials
```

เพิ่ม Authorized redirect URI:

```txt
https://<authDomain>/__/auth/handler
```

## Netlify Deploy

วิธีเอาเว็บขึ้น online ผ่าน Netlify:

1. Push โฟลเดอร์นี้ขึ้น GitHub repository
2. เข้า `https://app.netlify.com/`
3. กด `Add new site -> Import an existing project`
4. เลือก GitHub แล้วเลือก repository ของเว็บนี้
5. ตั้งค่า deploy:

```txt
Branch to deploy: main
Base directory: เว้นว่าง ถ้า repo นี้มีไฟล์เว็บอยู่ที่ root
Build command: เว้นว่าง
Publish directory: .
```

ถ้า repo เป็น monorepo และโฟลเดอร์นี้อยู่ใต้ path อื่น ให้ตั้ง `Base directory` เป็น path ของโฟลเดอร์ `tinmeaw-manager`

ไฟล์ที่ Netlify ใช้:

```txt
netlify.toml
_headers
```

- `netlify.toml` กำหนดให้ publish จาก root ของโปรเจกต์
- `_headers` ใส่ security headers สำหรับเว็บที่ deploy แล้ว
- ไม่ต้องตั้ง Environment variables สำหรับ static mode นี้ เพราะค่า frontend อยู่ใน `js/config.js`
- ห้ามใส่ Google OAuth Client Secret หรือ Firebase service account ใน Netlify environment ถ้าเว็บยังไม่มี backend/functions

หลัง deploy สำเร็จ ให้จด Netlify URL เช่น:

```txt
https://your-site.netlify.app
```

แล้วนำ URL นี้ไปตั้งค่าต่อ:

1. Firebase Authentication -> Settings -> Authorized domains
2. Google OAuth consent screen -> App domain, privacy policy, terms of service
3. ถ้ามี custom domain ให้เพิ่มทั้ง `yourdomain.com` และ `www.yourdomain.com`

ถ้าจะใช้ custom domain:

1. Netlify -> Site configuration -> Domain management
2. กด `Add a domain`
3. ตั้ง DNS ตามที่ Netlify แสดง
4. รอ SSL certificate พร้อม แล้วเปิดเว็บด้วย `https://`

## Upload

Upload app static files ไปยัง host ที่เลือก แล้วเปิดเว็บจาก domain จริงเพื่อตรวจสอบ

## Checklist

- [ ] Push repo ขึ้น GitHub
- [ ] Import GitHub repository เข้า Netlify
- [ ] ตั้ง Netlify `Build command` เป็นค่าว่าง
- [ ] ตั้ง Netlify `Publish directory` เป็น `.`
- [ ] Deploy สำเร็จและได้ URL จริง
- [ ] ใส่ Firebase Web config ใน `js/config.js`
- [ ] เปิด Google provider ใน Firebase Authentication
- [ ] เพิ่ม domain จริงใน Authorized domains
- [ ] สร้าง Firestore Database
- [ ] Publish Firestore Rules
- [ ] Enable Google Sheets API
- [ ] Enable Google Calendar API
- [ ] ตั้ง OAuth consent screen ด้วย URL ของ domain จริง
- [ ] เพิ่ม OAuth redirect URI
- [ ] ทดสอบ Login
- [ ] ทดสอบ Sync Sheets
- [ ] ทดสอบ Sync Calendar
