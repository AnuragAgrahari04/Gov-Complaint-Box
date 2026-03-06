# 🏛️ Gov-Complaint-Box

> **AI-Powered Government Grievance Management System**  
> Built with Flask · React · LLaMA3 (Groq) · Salesforce BLIP · LangChain

---

# 🌐 Live Demo

| Service | Live URL |
| :--- | :--- |
| **🖥️ Frontend (Citizen + Admin Portal)** | [https://gov-complaint-box-04.vercel.app/login](https://gov-complaint-box-04.vercel.app/login) |
| **⚙️ Backend REST API** | [https://gov-complaint-box.onrender.com](https://gov-complaint-box.onrender.com) |

---

# 🔐 Demo Credentials

To test the full functionality of the platform, you can use the pre-seeded Admin account or register your own Citizen account.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@gcb.gov.in` | `Admin@123` |
| **Citizen** | *Register a new account* | *Your choice* |

⚠️ Hosted on Render free tier.

---

## 🌟 What Is This?

Gov-Complaint-Box is a full-stack civic-tech platform that lets citizens submit complaints to government departments and tracks them through resolution — powered by AI for automatic classification, urgency detection, and department routing.

---

## ✨ Features

### For Citizens
- 📝 Submit complaints via text, image, or voice
- 🤖 AI auto-classifies complaints (department, category, urgency)
- 📍 Geo-tag complaints with GPS
- 📊 Track complaint status in real-time
- 🔐 Secure login and registration

### For Admins/Officers
- 📋 View and filter all complaints
- ✅ Update complaint status with notes
- 👮 Create and manage officers per department
- 📈 Analytics dashboard (charts by department, category, status)
- 🗺️ Map view of all complaints

### AI Capabilities
- 🧠 **LLaMA3 via Groq** — Ultra-fast complaint classification
- 🖼️ **Salesforce BLIP** — Image-to-text captioning
- 🎤 **Whisper (Groq)** — Voice complaint transcription
- 🔍 **Sentence Transformers** — Duplicate complaint detection

---

## 🗂️ Project Structure

```
gov-complaint-box/
├── backend/
│   ├── app.py                    # Flask app entry point
│   ├── extensions.py             # Flask extensions (db, jwt, limiter)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── models/
│   │   └── models.py             # User, Complaint, ComplaintUpdate
│   ├── routes/
│   │   ├── auth_routes.py        # Register, login, profile
│   │   ├── complaint_routes.py   # Submit, track, update, analytics
│   │   └── admin_routes.py       # User management, officer creation
│   └── services/
│       └── ai_service.py         # LLaMA3, BLIP, Whisper, embeddings
│
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.jsx               # Routing + auth guards
│       ├── index.js
│       ├── context/
│       │   └── AuthContext.jsx   # Global auth state
│       ├── pages/
│       │   ├── AuthPage.jsx      # Login + Register
│       │   ├── CitizenDashboard.jsx
│       │   └── AdminDashboard.jsx
│       └── utils/
│           └── api.js            # Axios API client
│
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local)

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/gov-complaint-box.git
cd gov-complaint-box
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
python app.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Backend runs on `http://localhost:5000`  
Frontend runs on `http://localhost:3000`

---

## 🔐 Default Credentials

| Role  | Email                | Password  |
|-------|----------------------|-----------|
| Admin | admin@gcb.gov.in     | Admin@123 |

> ⚠️ Change this in production!

---

## 📡 API Endpoints

### Auth
| Method | Endpoint           | Description     |
|--------|--------------------|-----------------|
| POST   | /api/auth/register | Register citizen |
| POST   | /api/auth/login    | Login           |
| GET    | /api/auth/me       | Get profile     |
| PUT    | /api/auth/me       | Update profile  |

### Complaints
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | /api/complaints/                  | Submit complaint      |
| GET    | /api/complaints/my                | My complaints         |
| GET    | /api/complaints/                  | All complaints (admin)|
| GET    | /api/complaints/:id               | Single complaint      |
| PUT    | /api/complaints/:id/status        | Update status         |
| PUT    | /api/complaints/:id/assign        | Assign officer        |
| GET    | /api/complaints/analytics/summary | Analytics             |
| GET    | /api/complaints/map/points        | Map data              |

### Admin
| Method | Endpoint                  | Description       |
|--------|---------------------------|-------------------|
| GET    | /api/admin/users          | List all users    |
| PUT    | /api/admin/users/:id      | Update user role  |
| POST   | /api/admin/create-officer | Create officer    |
| GET    | /api/admin/stats          | System stats      |

---

## 🧠 AI Pipeline

```
User submits complaint (text / image / voice)
        ↓
[Image?] → Salesforce BLIP → Caption
[Audio?] → Groq Whisper    → Transcript
        ↓
Combine all text
        ↓
Sentence Transformers → Duplicate check
        ↓
LangChain Prompt → Groq LLaMA3
        ↓
Structured JSON: department, category, subcategory, urgency, priority
        ↓
Store in SQLite DB → Return to citizen
```

---

## 🌐 Environment Variables

```env
GROQ_API_KEY=your_groq_api_key         # Get from console.groq.com
JWT_SECRET_KEY=your_secret_key          # Any long random string
DATABASE_URL=sqlite:///gov_complaints.db
FLASK_ENV=development
```

---

## 🏗️ Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, React Router, Recharts  |
| Backend     | Flask, SQLAlchemy, Flask-JWT      |
| Database    | SQLite (dev) / PostgreSQL (prod)  |
| AI / LLM    | LLaMA3-8b via Groq API            |
| Vision AI   | Salesforce BLIP                   |
| Voice AI    | Whisper via Groq                  |
| Embeddings  | sentence-transformers (MiniLM)    |
| Orchestration | LangChain                       |
| Deployment  | Docker + Docker Compose           |

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

Built with ❤️ for civic tech — making government complaint handling faster, smarter, and fairer.
