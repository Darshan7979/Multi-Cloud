# CloudFusion - Setup Checklist

## ✅ Already Configured

### 1. **Database (MongoDB Atlas)**
- Status: **✓ CONNECTED**
- Connection: `mongodb+srv://sonawanedarshan0707_db_user:Pass123@cluster0.pqylahb.mongodb.net/campus_cloud`
- Database: `campus_cloud`
- No action needed!

### 2. **Firebase (Authentication & Storage)**
- Status: **✓ CONFIGURED**
  - **Frontend Web Config**: ✓ (firebase-config.js has valid credentials)
  - **Backend Service Account**: ✓ (base64 encoded in .env)
  - **Storage Bucket**: ✓ `campus-cloud-9a88c.appspot.com`
- No action needed!

---

## ⚠️ Needs Configuration

### 3. **Cloudinary (Alternative Cloud Storage)**
- Status: **❌ INCOMPLETE - Placeholder values**
- Currently in `backend/.env`:
  ```env
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```

#### How to Get Cloudinary Credentials:

1. **Create Free Account**
   - Go to: https://cloudinary.com/users/register/free
   - Sign up and verify email

2. **Get API Keys**
   - Log in to Dashboard: https://cloudinary.com/console
   - You'll see on the Dashboard:
     - **Cloud Name** (top of dashboard)
     - **API Key** (below Cloud Name)
     - **API Secret** (below API Key)

3. **Update `backend/.env`**
   ```env
   CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   CLOUDINARY_API_KEY=your_actual_api_key
   CLOUDINARY_API_SECRET=your_actual_api_secret
   ```

4. **Restart Backend**
   ```bash
   npm run dev
   ```

---

## 📋 Current Environment Variables Status

### `backend/.env`
```env
PORT=4000                                  ✓
MONGODB_URI=...                            ✓
CORS_ORIGIN=http://localhost:5500,...      ✓
FIREBASE_SERVICE_ACCOUNT_BASE64=...        ✓
FIREBASE_STORAGE_BUCKET=...                ✓
CLOUDINARY_CLOUD_NAME=your_cloud_name      ❌ NEEDED
CLOUDINARY_API_KEY=your_api_key            ❌ NEEDED
CLOUDINARY_API_SECRET=your_api_secret      ❌ NEEDED
```

### `frontend/firebase-config.js`
```javascript
apiKey: "AIzaSyBevRw_Os--qfl3z5fdg5DDPnnFuEA9LTg"           ✓
authDomain: "campus-cloud-9a88c.firebaseapp.com"            ✓
projectId: "campus-cloud-9a88c"                             ✓
storageBucket: "campus-cloud-9a88c.firebasestorage.app"     ✓
messagingSenderId: "1029722549186"                          ✓
appId: "1:1029722549186:web:1445d5974dcbb28d90845b"         ✓
```

---

## 🚀 Next Steps

1. **[REQUIRED]** Get Cloudinary credentials and update `.env`
2. **[OPTIONAL]** Test full upload functionality (Firebase Storage works, Cloudinary will work after step 1)
3. **[OPTIONAL]** Configure frontend CORS if serving from different port

---

## 📝 What Each Service Does

| Service | Purpose | Status |
|---------|---------|--------|
| **MongoDB Atlas** | Main database (users, files metadata) | ✅ Ready |
| **Firebase Auth** | User authentication (register/login) | ✅ Ready |
| **Firebase Storage** | Primary cloud file storage | ✅ Ready |
| **Cloudinary** | Secondary cloud file storage | ⏳ Needs Keys |

---

## ✨ Quick Test Commands

Once Cloudinary is configured, test with:

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend (separate terminal)
cd frontend
npx serve .

# Then visit http://localhost:5500 in browser
```

Try uploading a file - it should work with Firebase Storage immediately, and with Cloudinary once keys are added.
