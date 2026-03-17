# 💳 Manu Expense Tracker — Web App

A **Google Material Design 3** expense tracker web app.  
Hosted free on GitHub Pages. Data saved directly to your GitHub repo.

---

## 🚀 Setup in 5 Minutes

### Step 1 — Create a GitHub Repo

1. Go to **github.com** → click **New repository**
2. Name it: `expense-tracker` (or anything you like)
3. Set to **Public** (required for GitHub Pages free hosting)
4. Click **Create repository**

---

### Step 2 — Upload the Files

Upload all these files to the root of your repo:
- `index.html`
- `style.css`
- `app.js`
- `data.json`
- `README.md`

**Easy way:** On your repo page → click **Add file → Upload files** → drag all 5 files → commit.

---

### Step 3 — Enable GitHub Pages

1. Go to your repo → **Settings** tab
2. Scroll to **Pages** section (left sidebar)
3. Under **Source** → select **Deploy from a branch**
4. Branch: **main** → folder: **/ (root)**
5. Click **Save**
6. Wait ~1 minute → your site will be live at:  
   `https://YOUR_USERNAME.github.io/expense-tracker/`

---

### Step 4 — Get a Personal Access Token (PAT)

This lets the app save your expenses back to GitHub.

1. Go to **github.com → Settings** (your profile, top right)
2. Scroll down → **Developer settings**
3. **Personal access tokens → Tokens (classic)**
4. Click **Generate new token (classic)**
5. Give it a name: `expense-tracker`
6. Tick the **repo** checkbox (full repo access)
7. Set expiration as you wish (No expiration is fine)
8. Click **Generate token**
9. **Copy the token** — you won't see it again!

---

### Step 5 — Configure the App

1. Open your app: `https://YOUR_USERNAME.github.io/expense-tracker/`
2. Click the ⚙️ **Settings** icon (top right)
3. Fill in:
   - **GitHub Username**: your GitHub username
   - **Repository Name**: `expense-tracker`
   - **Personal Access Token**: paste the token from Step 4
4. Click **Test** → should say ✅ Connected!
5. Click **Save**

**Done! Start adding expenses! 🎉**

---

## 📱 How to Use

| Action | How |
|--------|-----|
| Add expense | Tap the blue **+** button (bottom right) |
| Mark settled | On expense card → tap ✅ icon |
| Delete expense | On expense card → tap 🗑️ icon |
| Filter expenses | Use chips at top of Expenses tab |
| Sync data | Tap 🔄 icon in top bar |
| View charts | Dashboard tab |
| Check who owes whom | Settlement tab |

---

## 💰 How It Works (Manu-centric)

**Scenario 1 — Manu pays:**  
Manu pays ₹1000 for food for 4 people → enter amount ₹1000, Paid By = Manu, split all 4 → app records Bhargav, Keshav, Pradeep each owe Manu ₹250.

**Scenario 2 — Someone else pays:**  
Bhargav pays ₹1000 → Manu enters only his own share ₹250, Paid By = Bhargav, split includes Manu → app records Manu owes Bhargav ₹250. Keshav/Pradeep not tracked.

---

## 🔒 Security Note

Your PAT is stored only in your **browser's localStorage** — it is never sent anywhere except the official GitHub API. Nobody else can see it.

---

## 👥 People

- Manu (Owner)
- Bhargav
- Keshav
- Pradeep

---

## 🏷️ Categories (18)

Food & Dining, Travel & Transport, Accommodation/Rent, Groceries, Entertainment, Shopping, Medical/Health, Utilities, Fuel/Petrol, Movies & OTT, Snacks & Beverages, Party/Celebration, Sports & Fitness, Electronics, Education, Gifts, Personal Care, Miscellaneous
