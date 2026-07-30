# Yinglima Procurement & Trade ERP Platform 🚀

A modern multi-tenant enterprise ERP platform designed for **YINGLIMA PROCUREMENT & TRADE** with Darsh Impex UI layout, multi-company support (Uganda & China HQs), 2-layer consignment inquiry engine, CBM volume calculator, stock safety guards, and AI optimization service.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons (`http://localhost:3000`)
- **Backend API**: NestJS (Node.js), TypeScript, Prisma ORM (`http://localhost:4000`)
- **AI Microservice**: Python FastAPI, Uvicorn, Pydantic (`http://localhost:8000`)
- **Database**: PostgreSQL (Prisma Studio GUI at `http://localhost:5555`)

---

## 🚀 How to Run the Project

### Prerequisites
Make sure you have installed:
- [Node.js (v18 or higher)](https://nodejs.org/)
- [Python (v3.10 or higher)](https://www.python.org/)
- [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/ominhyma-del/ERP_yinglima.git
cd ERP_yinglima
```

---

### Step 2: Start React Frontend (UI)

Open Terminal #1:
```bash
cd frontend
npm install
npm run dev
```
👉 Access UI at: **`http://localhost:3000`**

---

### Step 3: Start NestJS Backend API

Open Terminal #2:
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```
👉 API server running at: **`http://localhost:4000`**

---

### Step 4: Start Python AI Microservice

Open Terminal #3:
```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
👉 AI service running at: **`http://localhost:8000`**

---

### 🗄️ Database Management (Prisma Studio)

To inspect and manage all PostgreSQL database tables visually in your browser:
```bash
cd backend
npx prisma studio
```
👉 Open Prisma Studio GUI at: **`http://localhost:5555`**

---

### 🐳 Alternative: 1-Command Docker Startup

If you have Docker installed:
```bash
docker-compose up --build
```

---

## 📄 Business Domain Specs Implemented

1. **Suppliers**: 2-Stage Profile Entry (Basic & Main Data Profile), Factory Visit tracking, Sub-contacts table, 1-Way Status rule (`NEW` → `EXISTING`), Delete guards.
2. **Buyers (Clients)**: Uganda defaults, Phone digit validation, Client Grade A/B/C, Potential tracking.
3. **Product Catalog**: Tally & Invoice Product Names, HSN Codes & China Refund VAT %, Auto CBM calculation $(L \times W \times H) / 1,000,000$, Stock deletion guard (`stock == 0`).
4. **Local Purchase / Inquiry**: 2-Layer Consignment engine (`FB1`, `FB2`, `OS1`, `ING1`), Interactive line item grid, License Required **RED ROW HIGHLIGHT**, China Procurement remarks popover, Bulk Tally Entry Posting.
5. **Import / Export**: Built-in CSV/Excel upload and dynamic CSV data export on all modules.
