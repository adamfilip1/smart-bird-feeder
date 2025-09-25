
https://github.com/user-attachments/assets/3aae03ff-7ea2-4fea-a6bc-3823146744d2

# Smart Bird Feeder

Group project developed at **Unicorn University** combining IoT hardware with a React web app.  
Hardware uses a **Hardwario Core Module** with a built-in accelerometer; data flows via a **Node-RED gateway** to the cloud. The web app provides multi-feeder accounts, activity graphs, and Discord alerts.

I Focused on microcontroller programming and stable communication between hardware and cloud.


## Features
- Microcontroller on **Hardwario Core Module** (accelerometer X/Y/Z).
- Real-time data transfer via **Node-RED** gateway.
- **React** web app with login and **multiple feeders per account**.
- **Activity charts** based on accelerometer events.
- **Discord notifications** when motion is detected.

## Architecture (high level)
Hardwario Core (accelerometer) → Node-RED (cloud gateway) → REST/Webhook → React app (charts, auth, alerts).

##Demo Mode
The app runs in **demo mode** (demo accounts and statistics for illustration) when: REACT_APP_DEMO=1
In demo mode:
Login is not validated against the backend.
Data is simulated for demonstration.

App runs on http://localhost:3000.
Run:
  npm start
