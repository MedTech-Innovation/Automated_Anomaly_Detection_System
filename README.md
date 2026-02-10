# MedTech Innovation Software

Our mission is to empower radiologists and oncologists with AI-driven MRI analysis tools that enhance tumor detection accuracy, accelerate diagnosis, and ultimately save lives through early intervention.

## 🧠 Project Demo

https://drive.google.com/file/d/1OM8_Tgsj5hppReEMjlqOSP3IZ0Y5whO8/view?usp=drive_link)

## 🚀 Quick Start Guide

This guide will help you set up and run the MedTech Innovation Software project on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** and **npm** - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 12+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Download Git](https://git-scm.com/downloads)

## 🔧 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/MedTech-Innovation/MedTech.git
cd MedTech
```

### 2. Backend Setup

#### 2.1. Navigate to Backend Directory

```bash
cd backend
```

#### 2.2. Create a Virtual Environment (Recommended)

**Windows:**
```powershell
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 2.3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 2.4. Set Up Database

**Option A: Using PowerShell Script (Windows)**

```powershell
.\setup_database.ps1
```

**Option B: Manual Setup**

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE medtech;
   ```

2. Create the `.env` file:
   ```powershell
   # Copy the example file
   Copy-Item env.example .env
   ```

3. Edit `.env` and set your `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/medtech
   ```

   > **Note:** If your password contains special characters, write them as-is. The code will encode them automatically.

For detailed database setup instructions, see [DATABASE_SETUP.md](backend/DATABASE_SETUP.md)

#### 2.5. Download ML Models

The ML models are not included in the repository due to their large size (>100MB). You need to place them in the following directories:

- **Eye Detection Model:** `backend/model/diabetic-retinopathy/best_model.h5`
- **Lung Detection Model:** `backend/model/pneumonia/model.safetensors`
- **Skin Detection Model:** `backend/model/skin-cancer/model.safetensors`
- **Brain Tumor Model:** `backend/model/brain-tumor/Brats20-Model.h5`

> **Note:** Contact the project maintainers to obtain the model files.

### 3. Frontend Setup

#### 3.1. Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2. Install Node Dependencies

```bash
npm install
```

## ▶️ Running the Project

### Start the Backend Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Activate your virtual environment (if not already activated):
   **Windows:**
   ```powershell
   venv\Scripts\activate
   ```
   **Linux/Mac:**
   ```bash
   source venv/bin/activate
   ```

3. Run the Flask application:
   ```bash
   python app.py
   ```

   The backend server will start on `http://localhost:5000`

### Start the Frontend Development Server

1. Open a new terminal window

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` (or the port shown in the terminal)

## 🌐 Accessing the Application

Once both servers are running:

- **Frontend:** Open your browser and navigate to `http://localhost:5173`
- **Backend API:** Available at `http://localhost:5000`

## 📁 Project Structure

```
MedTech/
├── backend/                 # Flask backend application
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── db.py               # Database configuration
│   ├── utils/              # Utility modules
│   │   ├── eye_detection.py
│   │   ├── lung_detection.py
│   │   ├── skin_detection.py
│   │   └── ...
│   ├── model/              # ML model files (not in git)
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   └── utils/          # Utility functions
│   └── package.json        # Node dependencies
│
└── README.md               # This file
```

## 🔐 Authentication

The application includes user authentication with role-based access:

- **Sign Up:** Create a new account with your name, email, password, and specialty
- **Sign In:** Log in with your credentials
- **Specialties:** 
  - `Ophtalmologue` → Eye Detection Page
  - `Pneumologue` → Lung Detection Page
  - `Dermatologue` → Skin Detection Page
  - `Neurologue` → Tumor Detection Page

## 🛠️ Troubleshooting

### Backend Issues

**Database Connection Error:**
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Check that the database `medtech` exists

**Model Loading Errors:**
- Verify all model files are in the correct directories
- Check file permissions
- Ensure sufficient memory is available

**Port Already in Use:**
- Change the port in `app.py` or stop the process using port 5000

### Frontend Issues

**Port Already in Use:**
- Vite will automatically use the next available port
- Or specify a port: `npm run dev -- --port 3000`

**Module Not Found:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### General Issues

**Python Virtual Environment:**
- Ensure the virtual environment is activated before running the backend
- Reinstall dependencies if packages are missing

**Git Issues:**
- Large model files are excluded from git (see `.gitignore`)
- Use Git LFS if you need to version control large files

## 📚 Additional Documentation

- [Database Setup Guide](backend/DATABASE_SETUP.md)
- [Environment Variables Setup](backend/CREATE_ENV.md)
- [GitHub Push Guide](GITHUB_PUSH_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is part of the MedTech Innovation Software initiative.

## 👥 Team

Project Team 5 - MedTech Innovation Software

---

For more information or support, please contact the project maintainers.
