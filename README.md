# AURA: Universal Lifecycle Orchestrator

AURA is a next-generation manufacturing intelligence and circularity platform designed to protect brands, empower consumers, and ensure compliance with upcoming EU 2026 ESPR (Ecodesign for Sustainable Products Regulation) mandates.

**Live Demo**: https://aura-134o.vercel.app/
**Admin Email and Password**
Email: tansri011@gmail.com
Password: tansri011@

---

## 🚀 Key Features

### 1. Digital Product Passport (DPP)
AURA generates GS1-compliant Digital Product Passports that store a product's entire lifecycle story—from raw material composition to final recycling.

### 2. Anti-Counterfeiting Engine
Prevents database scraping and serial enumeration using cryptographically signed QR codes. Every scan is verified against a secure HMAC signature before revealing product data.

### 3. Regulatory Intelligence Scout
Uses **You.com Research API** to cross-reference product materials with real-time EU legal updates, providing brands with a "Compliance Risk Score" (Low/Medium/High).

### 4. Service Pulse Monitoring
A real-time health dashboard for the Multi-Agent System (MAS), monitoring the status of 8 core infrastructure pillars (Supabase, Sanity, Foxit, You.com, Perfect Corp, Deepgram, Passport Agent, and Regulatory Scout).

### 5. Circularity & End-of-Life (EOL)
Triggers non-destructive lifecycle updates. When a product is recycled, AURA updates its status in the Sanity Immutability Layer and generates a legally binding "End-of-Life" certificate via **Foxit**.

### 6. Voice-Powered Manufacturing
Enables factory floor workers to record material composition and carbon footprint data hands-free using **Deepgram** voice-to-text integration.

---

## 🛠 Tech Stack & APIs

| Service | Purpose |
| :--- | :--- |
| **Next.js 16 (Turbopack)** | Full-stack framework with Edge runtime support. |
| **Supabase** | Authentication, PostgreSQL database, and scan analytics. |
| **Sanity CMS** | Immutability layer for product lifecycle events and manufacturing data. |
| **You.com Search** | Real-time regulatory research and ESPR risk assessment. |
| **Foxit** | Generation of legally binding PDF Passports and EOL Certificates. |
| **Perfect Corp** | Consumer Fit Satisfaction & VTO (Virtual Try-On) analytics. |
| **Deepgram** | Voice-to-text processing for manufacturing floor data entry. |
| **Tailwind CSS** | Premium, responsive UI/UX for the Admin Dashboard. |

---

## 🏗 System Architecture

AURA follows a **Multi-Agent System (MAS)** architecture:
- **Orchestrator Agent**: Manages task delegation and system-wide health reporting.
- **Passport Agent**: Handles SHA-256 hashing and Foxit PDF generation.
- **Regulatory Scout**: Powers the intelligence layer by scanning legal mandates.
- **Fit Agent**: Analyzes consumer VTO data to predict return probabilities.

---

## 🔒 Verification & Security

Every product in AURA is protected by:
- **HMAC-SHA256 Signing**: All QR URLs include a cryptographic signature generated with a secret salt.
- **Audit Trails**: Sanity's schema enforces read-only fields for verified production data, ensuring legal immutability.
- **Secure Redirector**: A dedicated gateway verified signatures before exposing sensitive DPP details.

---

## 📦 Getting Started

```bash
# Clone the repository
git clone https://github.com/Tanjir-Mahmud/AURA

# Install dependencies
npm install

# Run development server
npm run dev
```

*Note: Requires environment variables for Supabase, Sanity, Foxit, and You.com as detailed in `.env.example`.*
