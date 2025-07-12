# 🛠 Complaint Assistant API

This is an intelligent complaint-handling Flask API that analyzes user complaints using **LLMs (LLaMA3 via Groq)** and categorizes them by **urgency, department, category, and subcategory**. It also supports **image captioning** using **Salesforce's BLIP** model to interpret image-based complaints.

---

## 🚀 Features

- 🔍 **Complaint Classification**
  - Detects whether a complaint is **urgent**.
  - Categorizes complaints into:
    - **Main Categories:** Corruption, Crime, Electricity Issue, Public Transport, Road Maintenance, Water Supply.
    - **Subcategories:** Chain Snatching, Power Outage, Potholes, etc.
  - Assigns complaints to the correct **department**.

- 🖼 **Image-to-Text**
  - Uses **Salesforce BLIP** to generate descriptive captions from images.
  - Useful for image-based complaint detection.

---

## 🧠 Powered By

- **Groq API (LLaMA3-8b-8192)** – for fast and intelligent complaint understanding.
- **Salesforce BLIP** – for high-quality image caption generation.
- **Langchain** – for structured prompt templating.
- **Flask** – lightweight REST API backend.

---

## 📦 API Endpoints

### `GET /`
Returns a welcome message.

---

### `POST /complaint`

📨 **Request JSON:**
```json
{
  "complaint": "There is no water supply in my area for the last 3 days."
}
```

📥 **Response JSON:**
```json
{
  "department": "Your complaint is registered in 'Water Supply' with 'No Water Supply' and will be attended to shortly.",
  "urgent": "YES",
  "Category": "Water Supply",
  "Subcategory": "No Water Supply"
}
```

---

### `POST /caption`

📨 **Form-Data:**
- `image`: (Upload a `.jpg` or `.png` image)

📥 **Response JSON:**
```json
{
  "caption": "a broken road with potholes and debris"
}
```

---

## 🛠 Setup Instructions

### 🔧 Prerequisites

- Python 3.8+
- Groq API key
- GPU recommended for BLIP inference

---

### 🔄 Installation

```bash
git clone https://github.com/your-username/complaint-assistant-api.git
cd complaint-assistant-api
pip install -r requirements.txt
```

---

### 🔐 Environment Variables (`.env`)

```env
GROQ_API_KEY=your_groq_api_key
```

---

### ▶️ Run the Server

```bash
python app.py
```

---

## 📂 Project Structure

```
├── app.py                  # Main Flask application
├── .env                    # API keys and environment config
├── tmp/                    # Temporary folder for uploaded images
├── requirements.txt        # All required Python packages
```

---


