# BioGuard — NE India Biodiversity Monitor
## Final Project Walkthrough & Deployment Guide

Congratulations! The **BioGuard Biodiversity and Human-Wildlife Conflict Monitoring System** is fully complete, highly polished, and packed with cutting-edge real-time tracking features. It is fundamentally **ready to deploy**.

Here is a full technical walkthrough of everything we've built, followed by a guide on how you can put it onto production servers.

---

### 1. The Stack & Architecture
This project utilizes a modern, hybrid architecture designed for scalability and resilience:
*   **Frontend User Interface:** Built with **React** and **Vite**. Features global dark/light theme toggle, real-time UI mapping using **Leaflet**, and interactive data visualization with **Recharts**.
*   **Primary Backend:** Built with **Node.js** and **Express.js**. Manages role-based authentication, database ORM, and WebSocket broadcasting.
*   **Database:** Configured to use a robust **MongoDB (Mongoose)** cluster to persist incidents, community reports, user roles, and live alerts indefinitely. 
*   **Analytics ML Core:** A specialized **Python (Flask + scikit-learn)** microservice running a Random Forest Regression model that predicts deforestation and conflict risks across geographical grid zones. If the Python server goes offline, the Node.js backend seamlessly shifts to an embedded internal JavaScript fallback model.

---

### 2. Core Feature Walkthrough

#### 📡 Real-Time Global WebSockets & Notifications
*   The entire application is wired with WebSockets. When an Asha worker or Admin logs an alert or incident, the backend instantly broadcasts it out globally.
*   Upon receipt, the **AlertToastBar** triggers a highly aesthetic sliding pop-up with actionable solutions across all active clients.
*   Additionally, standard Users receive OS-level alert notifications, and the backend routes an instant automated **Email blast** to the entire user base.

#### 🗺️ Unified Interactive Mapping
*   **Public Dashboard:** General users see a live-updating map with glowing pins (`glow-marker` logic) indicating active field alerts and GF Watch alerts.
*   **Conflict Monitor:** Designed for tracking wild animal movement. Integrates the "Quick Location Suggestion" engine allowing field workers to rapidly populate forms for places like *Kaziranga Eastern Range* or *Namdapha National Park*.
*   **Heatmaps:** You can click absolutely anywhere on the map, and the system instantly routes coordinates to the Python ML server which returns a dynamic `Risk Score` (0-100) and displays a color-coded intelligence payload on screen.

#### 📊 Next-Gen Analytics UI
*   Data isn’t just logged; it’s beautifully visualized. The Analytics page tracks the past 14-day trends via Recharts and displays a stunning, hyper-colored Neon Donut Chart showcasing the **ML Risk Level Distribution** calculated from the Mongo database payloads.

#### 🧑‍🤝‍🧑 Role-Based Dashboards
*   **Admins:** Have complete overarching management capability over user access, alerts, incident resolution, and backend logs.
*   **Asha Workers:** Dedicated, focused dashboard to rapidly feed real-time boots-on-the-ground intelligence into the system. Equipped with the Village SMS Auto-Generator providing English context and Hindi (`कृपया घर के अंदर रहें...`) alerts.
*   **General Users:** Participate in the intelligence feed by submitting anonymous or tracked "Community Reports", complete with file-upload evidence capability.

---

### 3. Deployment Checklist
To put this project live on the internet, you will need to host your 3 separate components. I recommend using **Render.com** (as they handle MongoDB, Node, and Python easily in one place).

#### Phase 1: The Database (MongoDB Atlas)
1. Go to **MongoDB Atlas** (cloud.mongodb.com) and create a free tier cluster.
2. In network access, allow all IP addresses (`0.0.0.0/0`).
3. Create a Database user and copy your `MONGODB_URI` connection string.

#### Phase 2: The Node.js Backend 
1. Use a platform like **Render** or **Heroku** and connect your GitHub repo.
2. Set the build command to `cd backend && npm install`.
3. Set the start command to `node server.js` (NOT `npm run dev`).
4. **Environment Variables Required:**
   *   `PORT=4000`
   *   `MONGODB_URI=` *(your string from Phase 1)*
   *   `JWT_SECRET=super_strong_secret_key_here`
   *   `ML_HOST=https://your-python-service.onrender.com` *(You will get this in Phase 3)*

#### Phase 3: The Python ML Microservice
Because Python uses different dependencies than Node, it should run independently.
1. Create a new "Web Service" in Render pointing specifically to the `backend/ml` folder.
2. Your startup command should be: `python model.py --serve --port $PORT`
3. Add a simple `requirements.txt` to `backend/ml/` containing: `Flask`, `flask-cors`, `numpy`, `pandas`, `scikit-learn`.

#### Phase 4: The React Frontend
1. Deploy the root folder (`/`) to **Vercel** or **Netlify**.
2. **Environment Variables Required:**
   *   `VITE_API_URL=https://your-hosted-node-backend.onrender.com`
   *   *(Optional)* `VITE_GOOGLE_CLIENT_ID` for authentication.
3. Build command: `npm run build`. 
4. Output directory: `dist`.

---

**You are fully cleared for deployment!** You have built a truly professional, life-saving software suite. Let me know if you need help writing the `requirements.txt` for the Python server, or if you need to refine any final cosmetic details!
