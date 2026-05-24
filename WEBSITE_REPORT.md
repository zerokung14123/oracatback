# รายงานสรุปเว็บไซต์ Tinmeaw Manager

วันที่จัดทำ: 25 พฤษภาคม 2569  
โฟลเดอร์สำหรับอัปโหลดขึ้น Hosting: `D:\webapp\tinmeaw-manager`

## 1. ภาพรวมเว็บไซต์

Tinmeaw Manager เป็นเว็บแอปแบบ Static Single Page Application สำหรับจัดการงานถ่ายภาพของ Tinmeaw Studio ใช้งานผ่านหน้าเว็บโดยตรง และเชื่อมต่อบริการภายนอกเพื่อจัดเก็บ/ซิงก์ข้อมูล ได้แก่ Firebase, Google Sheets และ Google Calendar

เว็บไซต์ออกแบบให้ใช้สำหรับงานหลังบ้าน เช่น จัดการคิวงาน รายรับ เอกสารใบจอง การตั้งค่าธุรกิจ และโปรแกรมคำนวณภาษี โดยมีระบบ Login ก่อนเข้าใช้งาน

## 2. สถานะปัจจุบัน

- อัปเดตโค้ดจากชุด local ไปยังโฟลเดอร์ `tinmeaw-manager` แล้ว
- โฟลเดอร์นี้ถูกเตรียมไว้สำหรับ upload ขึ้น host/domain จริง
- โหมด Deploy เป็น Static Hosting ไม่ต้องมี build command
- มีไฟล์ `netlify.toml` สำหรับ Netlify แล้ว
- มีไฟล์ `_headers` สำหรับ security headers แล้ว
- ไม่มีไฟล์ `js/config.local.js` ในโฟลเดอร์ production
- ตรวจ syntax ของ JavaScript แล้วผ่านจากรอบตรวจล่าสุด

## 3. ฟีเจอร์หลักของเว็บไซต์

### 3.1 Login และระบบผู้ใช้

- มีหน้า Login ก่อนเข้าใช้งาน
- รองรับ Google OAuth
- ใช้ Firebase Authentication และ Firestore สำหรับข้อมูลแยกตามผู้ใช้
- มีระบบ session/runtime config สำหรับโหลดค่าการตั้งค่าบางส่วน

### 3.2 Dashboard

- แสดงสรุปภาพรวมรายรับ งานทั้งหมด งานที่เสร็จแล้ว และสถานะสำคัญ
- แสดงคิวงานใกล้ถึงวันถ่าย/วันส่งงาน
- มีกราฟรายรับแบบแท่งและกราฟวงกลม/โดนัท
- รองรับ event เมื่อนำเมาส์ไปชี้ที่กราฟ เพื่อแสดงรายละเอียดข้อมูลในกราฟ
- มีการแจ้งเตือน deadline และข้อมูลที่ควรติดตาม

### 3.3 คิวงาน

- เพิ่ม แก้ไข ลบ และจัดการข้อมูลงานถ่ายภาพ
- รองรับข้อมูลลูกค้า ประเภทงาน วันถ่าย วันส่งงาน ราคา มัดจำ ยอดคงเหลือ และสถานะงาน
- รองรับรูปภาพ/สลิปประกอบงาน
- ใช้ข้อมูลจากคิวงานเป็นแหล่งหลักสำหรับเอกสารใบจอง

### 3.4 เอกสารใบจอง

- สร้างใบจองเป็นรูปภาพสำหรับส่งให้ลูกค้า
- รายละเอียดในใบจองดึงจากรายละเอียด/หมายเหตุของคิวงาน
- เงื่อนไขและข้อกำหนดดึงจากเมนูตั้งค่า
- หากไม่ได้ตั้งค่าเงื่อนไข ระบบใช้ค่าเริ่มต้น: `สอบถามรายละเอียดเพิ่มเติม Inbox ได้เลยจ้า`
- รองรับข้อมูลธุรกิจ เช่น ชื่อร้าน ช่องทางติดต่อ และข้อความท้ายเอกสาร

### 3.5 รายรับ

- แสดงรายรับตามเดือน/ปี
- แยกข้อมูลตามประเภทงานและสถานะงาน
- มีกราฟวงกลม/โดนัทที่ปรับ UI ให้ทันสมัยขึ้น
- มี tooltip เมื่อชี้กราฟวงกลมและกราฟแท่ง
- รองรับการวิเคราะห์รายรับจากงานที่เสร็จแล้ว และงานยกเลิกที่มีมัดจำไม่คืน

### 3.6 โปรแกรมคำนวณภาษี

- คำนวณภาษีเงินได้บุคคลธรรมดาเบื้องต้น
- รองรับรายได้ ค่าใช้จ่าย ค่าลดหย่อน และการจำลองภาษี
- มีหน้าแนะนำ คู่มือลดหย่อน ปฏิทินภาษี และจำลองภาษี
- แก้ไขให้ UI เปลี่ยนตามธีมระบบแล้ว ทั้ง light theme และ dark theme

### 3.7 ตั้งค่า

- ตั้งค่าข้อมูลธุรกิจ
- ตั้งค่า Google Sheet ID และการเชื่อมต่อข้อมูล
- ตั้งค่าเงื่อนไขและข้อกำหนดสำหรับใบจอง
- ตั้งค่าประเภทงานและจำนวนวันส่งงาน
- มีเครื่องมือช่วยสร้าง/เชื่อม Google Sheet
- ลบช่องรายละเอียดการให้บริการออกแล้วตาม requirement ล่าสุด

### 3.8 หน้าเอกสารประกอบ

- `privacy.html` สำหรับนโยบายความเป็นส่วนตัว
- `terms.html` สำหรับเงื่อนไขการใช้งาน
- `robots.txt` สำหรับ crawler
- `.well-known/security.txt` สำหรับข้อมูล security contact
- มี cookie consent script

## 4. โครงสร้างไฟล์สำคัญ

| Path | รายละเอียด |
| --- | --- |
| `index.html` | หน้าเว็บหลักและ layout ของแอป |
| `css/style.css` | Style หลัก รวม theme, responsive layout, chart UI และ tax calculator UI |
| `js/app.js` | Logic หลักของแอป การเปลี่ยนหน้า dashboard/settings และ workflow รวม |
| `js/queue.js` | จัดการคิวงาน |
| `js/booking-document.js` | สร้างใบจอง/เอกสาร |
| `js/revenue.js` | รายรับ กราฟ และ tooltip |
| `js/tax-calculator.js` | โปรแกรมคำนวณภาษี |
| `js/firebase-data.js` | เชื่อม Firebase Authentication และ Firestore |
| `js/google-api.js` | เชื่อม Google Sheets/Calendar API |
| `js/google-oauth-v2.js` | Google OAuth flow |
| `js/config.js` | Public client config สำหรับ production |
| `js/v2-runtime-config.js` | Runtime config loader |
| `js/cookie-consent.js` | Cookie consent |
| `netlify.toml` | ตั้งค่า Netlify ให้ publish จาก root |
| `_headers` | Security headers สำหรับ Netlify |
| `setup/hosting/README.md` | คู่มือ setup hosting |

## 5. การเชื่อมต่อระบบภายนอก

### Firebase

- ใช้ Firebase Web Config ใน `js/config.js`
- ใช้ Firebase Authentication สำหรับ Login
- ใช้ Firestore สำหรับเก็บข้อมูลผู้ใช้
- ควรเปิด Firestore Rules ให้จำกัดข้อมูลตาม `request.auth.uid`
- ควรตั้งค่า Authorized domains ให้ตรงกับ domain จริงหลัง deploy

### Google APIs

ต้องเปิดใช้งาน API เหล่านี้ใน Google Cloud Project เดียวกับ Firebase:

- Google Sheets API
- Google Calendar API

Scope ที่ใช้งานโดยแอป:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/calendar`

## 6. สถานะ Config สำหรับ Production

ไฟล์ config หลักคือ:

```txt
js/config.js
```

ค่าที่ควรตรวจสอบก่อน upload:

- `GOOGLE_OAUTH_CLIENT_ID` ยังต้องใส่ Client ID จริง หรือให้ runtime endpoint เป็นผู้จ่ายค่า
- `SHEET_ID` ยังว่างได้ หากต้องการให้ผู้ใช้ตั้งค่าภายในแอปเอง
- `FIREBASE_CONFIG` ใส่ค่า public web config ของโปรเจกต์ Tinmeaw แล้ว
- `FIREBASE_APP_CHECK_SITE_KEY` ยังว่าง หากเปิดใช้ App Check ต้องใส่ site key
- ห้ามใส่ Google OAuth Client Secret หรือ Firebase service account ลงใน frontend

## 7. การ Deploy ขึ้น Netlify

โปรเจกต์นี้เป็น static web app จึงตั้งค่า Netlify ได้ดังนี้:

```txt
Build command: เว้นว่าง
Publish directory: .
```

ไฟล์ `netlify.toml` กำหนด publish directory เป็น root แล้ว:

```toml
[build]
  publish = "."
```

หลัง deploy ให้ตรวจสอบและตั้งค่าต่อ:

- เพิ่ม Netlify domain/custom domain ใน Firebase Authorized domains
- ตั้ง OAuth Consent Screen ด้วย URL จริง
- ตั้ง Privacy Policy URL เป็น `https://<domain>/privacy.html`
- ตั้ง Terms URL เป็น `https://<domain>/terms.html`
- เพิ่ม OAuth redirect URI ตาม Firebase auth domain: `https://<authDomain>/__/auth/handler`

## 8. Security และ Privacy

มี `_headers` สำหรับเพิ่ม security headers แล้ว เช่น:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` ปิด camera, microphone, geolocation
- `Content-Security-Policy` จำกัดแหล่ง script, image, frame และ connect
- `/api/*` ตั้ง `Cache-Control: no-store`

หมายเหตุ:

- Firebase Web Config เป็น public identifier ไม่ใช่ secret
- ความปลอดภัยจริงต้องควบคุมด้วย Firestore Rules, Authorized domains, OAuth consent และ App Check
- ห้ามนำ secret ฝั่ง server มาใส่ในไฟล์ frontend

## 9. Checklist ก่อนอัปโหลดขึ้น Hosting

- [ ] ตรวจ `js/config.js` ให้ค่าถูกต้องสำหรับ domain จริง
- [ ] ใส่ `GOOGLE_OAUTH_CLIENT_ID` หรือเชื่อม runtime config endpoint ให้พร้อม
- [ ] เปิด Firebase Authentication provider: Google
- [ ] เพิ่ม domain จริงใน Firebase Authorized domains
- [ ] สร้าง Firestore Database และ publish rules
- [ ] Enable Google Sheets API
- [ ] Enable Google Calendar API
- [ ] ตั้ง OAuth consent screen
- [ ] ตั้ง OAuth redirect URI
- [ ] ตรวจ `privacy.html` และ `terms.html` ให้ข้อมูลตรงกับ domain จริง
- [ ] Commit/push โค้ดขึ้น repository สำหรับ deploy
- [ ] Deploy Netlify โดยใช้ publish directory `.`
- [ ] ทดสอบ Login บน domain จริง
- [ ] ทดสอบเพิ่มคิวงาน
- [ ] ทดสอบสร้างใบจอง
- [ ] ทดสอบ tooltip กราฟวงกลมและกราฟแท่ง
- [ ] ทดสอบหน้าโปรแกรมคำนวณภาษีทั้ง light/dark theme
- [ ] ทดสอบ Sync Google Sheets
- [ ] ทดสอบ Sync Google Calendar

## 10. ไฟล์ที่ควรอัปโหลด

ควรอัปโหลดไฟล์และโฟลเดอร์เหล่านี้:

- `.well-known/`
- `css/`
- `js/`
- `setup/hosting/`
- `.gitignore`
- `_headers`
- `index.html`
- `netlify.toml`
- `privacy.html`
- `README.md`
- `robots.txt`
- `terms.html`
- `WEBSITE_REPORT.md`
- `วิธีการติดตั้ง.md` ถ้าต้องการแนบคู่มือภาษาไทยไปด้วย

ไม่ควรอัปโหลด:

- `js/config.local.js`
- โฟลเดอร์หรือไฟล์สำหรับ localhost/local server เท่านั้น
- ไฟล์ secret, service account, OAuth client secret

## 11. สรุปความพร้อม

เว็บไซต์ Tinmeaw Manager พร้อมสำหรับการเตรียม upload ขึ้น hosting ในระดับโค้ดและโครงสร้างไฟล์แล้ว จุดที่ต้องตรวจซ้ำก่อนใช้งานจริงคือ config ของ Google OAuth, Firebase Authorized domains, Firestore Rules และการทดสอบบน domain จริงหลัง deploy

เมื่อ deploy แล้ว ควรทดสอบ workflow สำคัญตั้งแต่ Login, เพิ่มคิวงาน, สร้างใบจอง, ดูรายรับ, hover tooltip บนกราฟ, ใช้โปรแกรมคำนวณภาษี และ sync กับ Google Sheets/Calendar ให้ครบก่อนส่งใช้งานจริง
