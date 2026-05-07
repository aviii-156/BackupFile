
[Deployed Site](https://backup-file-jjoe.vercel.app/)

## Preview

<p align="center">
	<img src="Screenshots/Screenshot%202026-05-07%20135911.png" alt="Screenshot 2026-05-07 13:59:11" width="400" />
	<img src="Screenshots/Screenshot%202026-05-07%20140248.png" alt="Screenshot 2026-05-07 14:02:48" width="400" />
	<img src="Screenshots/Screenshot%202026-05-07%20140437.png" alt="Screenshot 2026-05-07 14:04:37" width="400" />
</p>

# Quic Medi Description

🚀 QuickMedi – Project Description

In India, most medicine delivery apps like Blinkit and Apollo 24|7 rely on centralized warehouses, which often leads to higher prices and slower local utilization. At the same time, 1–5% of medicines in local pharmacies expire every year, resulting in a loss of nearly ₹270 crore due to lack of a proper selling platform.

💡 QuickMedi solves this problem by acting as a bridge between local pharmacies and customers through a SaaS-based platform.

⚙️ How It Works
Connects users directly with nearby pharmacies (Vocal for Local 🇮🇳)
Enables 10-minute medicine delivery from the closest store
Suggests low-cost generic alternatives
Uses AI to read prescriptions and recommend medicines
Displays real-time availability across local shops
📱 Key Features
⚡ Fast ordering from nearest pharmacy
💊 Generic medicine suggestions (cost reduction)
🤖 AI prescription scanner
🗺️ Nearby pharmacy discovery
⏰ Medicine reminder system
🌸 Period tracker
🤰 Week-by-week pregnancy tracking
🌍 Real-Life Impact
A customer gets medicine in 10 minutes from a nearby shop instead of waiting hours
A pharmacy sells near-expiry stock instead of losing money
A user saves 50–80% cost using generic medicines
Local businesses grow through digital connectivity

# QuickMedi Platform

QuickMedi is a comprehensive healthcare platform consisting of three main components:

- **quickmedi-ai**: Python-based AI backend for medicine matching, drug interaction checking, prescription analysis, and more.
- **quickmedi-api**: Node.js/Express REST API for managing users, orders, medicines, chatbots, and integrations.
- **quickmedi-web**: Next.js web frontend for user interaction, medicine search, emergency services, and more.

---

## quickmedi-ai

**Description:**
AI-powered backend for medicine data processing, interaction checking, and prescription analysis.

**Key Features:**
- Drug interaction checker
- Medicine matcher
- Duplicate and safety checker
- OCR and voice support
- AI chatbot integration

**Structure:**
- `main.py`: Entry point
- `models/`: AI/ML logic
- `routes/`: API endpoints
- `services/`: Business logic
- `schemas/`: Data validation
- `utils/`: Helpers
- `data/`: Datasets (medicines, interactions, voices)

**Setup:**
```bash
cd quickmedi-ai
pip install -r requirements.txt
python main.py
```

---

## quickmedi-api

**Description:**
Node.js/Express REST API for user, order, medicine, and chatbot management.

**Key Features:**
- User authentication
- Medicine catalog
- Order management
- Emergency and notification services
- Chatbot and fulfillment

**Structure:**
- `server.js`: Entry point
- `src/`: Source code (controllers, models, routes, services, utils)

**Setup:**
```bash
cd quickmedi-api
npm install
npm start
```

---

## quickmedi-web

**Description:**
Next.js web frontend for users to interact with the platform.

**Key Features:**
- Medicine search and comparison
- Emergency request interface
- User authentication
- Order and prescription management
- Chatbot and voice assistant

**Structure:**
- `src/`: App source (components, pages, context, services, utils)
- `public/`: Static assets

**Setup:**
```bash
cd quickmedi-web
npm install
npm run dev
```

---

## How to Run the Project

To run the full QuickMedi platform locally, follow these steps in order:

### 1. Start quickmedi-ai (Python Backend)
1. Open a terminal and navigate to the `quickmedi-ai` directory:
	```bash
	cd quickmedi-ai
	```
2. Install Python dependencies:
	```bash
	pip install -r requirements.txt
	```
3. Start the AI backend:
	```bash
	python main.py
	```

### 2. Start quickmedi-api (Node.js/Express API)
1. Open a new terminal and navigate to the `quickmedi-api` directory:
	```bash
	cd quickmedi-api
	```
2. Install Node.js dependencies:
	```bash
	npm install
	```
3. Start the API server:
	```bash
	npm start
	```

### 3. Start quickmedi-web (Next.js Frontend)
1. Open another terminal and navigate to the `quickmedi-web` directory:
	```bash
	cd quickmedi-web
	```
2. Install frontend dependencies:
	```bash
	npm install
	```
3. Start the development server:
	```bash
	npm run dev
	```

---

**Note:**
- Make sure you have Python (for quickmedi-ai) and Node.js (for quickmedi-api and quickmedi-web) installed on your system.
- Run each component in a separate terminal window.
- Start the components in the order: quickmedi-ai → quickmedi-api → quickmedi-web.

---

## Contributing
1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License
MIT License

## Authors
- Your Team Name / Contributors

---

For more details, see individual README files in each subproject.
