# Firebase Authentication Setup Guide

## Quick Setup Steps

### Step 1: Enable Firebase Authentication

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project (or create one)
3. Click **Authentication** in the left sidebar
4. Click **Get Started**
5. Go to **Sign-in method** tab
6. Enable **Email/Password**
7. Click **Save**

### Step 2: Get Firebase Web Config

1. In Firebase Console, click the gear icon ⚙️ → **Project settings**
2. Scroll down to **Your apps**
3. Click the **</>** (Web) icon to add a web app
4. Register your app with a nickname (e.g., "Multi-Cloud Storage")
5. Copy the **firebaseConfig** object

### Step 3: Update Frontend Config

Open `frontend/firebase-config.js` and replace with your config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 4: Get Service Account for Backend

1. In Firebase Console, go to **Project settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (e.g., `serviceAccountKey.json`)
4. Convert to Base64:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\serviceAccountKey.json")) | Set-Clipboard
```

**Linux/Mac:**
```bash
base64 -i serviceAccountKey.json | pbcopy
```

**Manual method:**
```bash
cat serviceAccountKey.json | base64
```

5. Paste the base64 string into `backend/.env`:
```env
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6...
```

### Step 5: Update Storage Bucket

In `backend/.env`, update:
```env
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

Replace `your-project-id` with your actual Firebase project ID.

## Testing Authentication

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npx serve .`
3. Open http://localhost:5500
4. Click **Register** tab
5. Enter name, email, and password
6. Click **Create Account**
7. You should be logged in automatically

## Common Issues

### "Missing Firebase ID token"
- Make sure you updated `frontend/firebase-config.js` with correct credentials

### "Invalid token" on backend
- Ensure `FIREBASE_SERVICE_ACCOUNT_BASE64` is correctly set in `backend/.env`
- Make sure the service account JSON is from the same Firebase project

### "User not found" error
- This happens if MongoDB user doesn't exist yet
- Backend automatically creates user on first login

### CORS errors
- Update `CORS_ORIGIN` in `backend/.env` to match your frontend URL
- Default: `http://localhost:5500`

## Security Notes

- **Never commit** your `firebase-config.js` or `.env` files with real credentials to Git
- The `.gitignore` already excludes these files
- Use environment-specific configs for production
- Enable email verification in Firebase Console for production use

## Next Steps

After Firebase Auth is working:

1. Enable Firebase Storage (for file uploads)
2. Set up Cloudinary account (optional second cloud)
3. Create MongoDB Atlas cluster
4. Update all environment variables in `backend/.env`
