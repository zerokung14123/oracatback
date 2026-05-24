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

## Upload

Upload app static files ไปยัง host ที่เลือก แล้วเปิดเว็บจาก domain จริงเพื่อตรวจสอบ

## Checklist

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
