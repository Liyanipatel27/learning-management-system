# LMS Project Documentation & Architecture Guide

Ye file aapke poore project ka deeply instruction manual hai. Isme samjhaya gaya hai ki project me kaunsi libraries use hui hain, controllers aur routes kaise kaam karte hain, kis feature ka code kahan milega, aur frontend/backend ka folder structure kaisa hai.

---

## 1. 📚 Libraries Used (Project ki Libraries)

Is project me modern web technologies ka use kiya gaya hai. MERN (MongoDB, Express, React, Node.js) stack ka upyog kiya gaya hai.

### 🌐 Frontend Libraries (`frontend/package.json`)
- **`react` & `react-dom`**: Frontend banane ka base framework (UI components ke liye).
- **`vite`**: React code ko bohot fast run aur build karne wala tool.
- **`react-router-dom`**: Pages (screens) ke beech me navigation handle karne ke liye (bin page reload kiye jaise Login se Dashboard jana).
- **`axios`**: Backend API ko calls bhejne aur Server se data mangwane ke liye (HTTP requests).
- **`socket.io-client`**: Real-time (live) communication ke liye (jaise Live Classroom chat ya notifications).
- **`recharts`**: Data ko sundar graphs aur chart ke roop me dashboard me dikhane ke liye.
- **`@monaco-editor/react`**: VS Code jaisa in-built code editor browser me hi dikhane ke liye (coding practice ke liye).
- **`react-markdown`**: AI se aane wale text (jo ki markdown format me hota hai) ko properly format aur display karne ke liye.
- **`jspdf` & `jspdf-autotable`**: Data, reports aur records ko PDF me convert karke download karwane ke liye.
- **`xlsx`**: Data ko Excel format me download karne aur read/write karne ke liye.

### ⚙️ Backend Libraries (`backend/package.json`)
- **`express`**: Node.js ka framework jisse API routes aur backend server banaya gaya hai.
- **`mongoose`**: MongoDB database ke sath jod (connection) banane aur data operations ke liye.
- **`socket.io`**: Real-time websocket server chalane ke liye (chat aur live classes ke liye).
- **`jsonwebtoken`**: Login token banane aur secure authentication ke liye (taaki pata chale kaun user site use kar raha hai).
- **`bcryptjs`**: Passwords ko safely encrypt (hash) karke database me save karne ke liye.
- **`@google/generative-ai` & `openai`**: Gemini aur OpenAI ka istemal AI Tutor aur doubt resolution me answers generate karne ke liye.
- **`multer` & `multer-storage-cloudinary`**: User dwara PDF/Images file upload manage karne aur unko seedhe cloud pe bhej ne ke liye.
- **`cloudinary`**: Uploaded assets (images, documents) ko external cloud me safely store karne ke liye.
- **`nodemailer`**: Emails bhejne ke liye (OTP bhejna, password reset ya notification ke liye).
- **`pdf-parse`**: Upload ki hui PDF files ka text padhne aur text extract karne ke liye (AI tool ko dene ke liye).
- **`xlsx`**: Excel se bulk students ya teachers ka data import karne ke liye.
- **`natural` & `stopword`**: Text analysis aur auto-grading processing (text ko clean aur samajhne me help) ke liye.

---

## 2. 🔀 Controller aur Route Kaise Use Hote Hain?

Is project me **MVC (Model-View-Controller)** pattern ko focus me rakh kar code likha gaya hai. Jab frontend se koi HTTP request aati hai to Controller aur Route aise kaam karte hain:

1. **Route (Yahan aati hai pehli request)** 
   - Backend ke `routes/` folder me URLs define hote hain. Jaise `router.post('/login', ...)`
   - Jab koi `https://yoursite.com/api/auth/login` par hit karta hai, to sabse pehle us route file (jaise `routes/auth.js`) ko call aati hai.
   - **Route ka main kaam**: Sahi URL request ko receive karna aur use proper "Controller" function ke paas bhej dena.

2. **Controller (Asli dimag / logic)**
   - API ka sara main business logic (kaam karne ka tarika) `controllers/` folder me hota hai (jaise `controllers/authController.js`).
   - Yahan Controller database model (`User.js`) se check karta hai ki email aur password valid hain ya nahi. Agar sahi hai, to token banakar frontend ko *Success* bhejta hai, varna *Error* return karta hai.

*📝 Note: Is project mein aapke paas kuchh main files ke Controllers (`classController.js`, `aiController.js`, `authController.js`) alag hain, lekin kuchh modules mein routes directly `routes/` folder ki files mein (jaise `course.js`, `admin.js`) hi logic apne andar include karte hain (Taaki jaldi development ho sake).*

---

## 3. 🧩 Kis Functionality Ka Code Kahan Hai?

Aap agar kisi specific feature me koi badlav (change) karna chahte hain, toh yahan dhundhein:

### A) Authentication System (Login, Register, OTP verify, Forgot Password)
- **Frontend Pages**: `src/pages/Login.jsx`, `src/pages/RequestAccount.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/VerifyOTP.jsx`
- **Backend Flow**: Frontend -> request to `backend/routes/auth.js` -> handles via `backend/controllers/authController.js`.
- **Database Model Used**: `backend/models/User.js`, `backend/models/AccountRequest.js`

### B) Dashboards (Role-based Home screens)
- **Admin**: Frontend page hai `src/pages/AdminDashboard.jsx`, aur iske API endpoints (backend logic) `backend/routes/admin.js` me hain.
- **Teacher**: Frontend page `src/pages/TeacherDashboard.jsx`.
- **Student**: Frontend page `src/pages/StudentDashboard.jsx`.

### C) Course & Assignment System (Courses banana, dikhana, assignments check karna)
- **Frontend Pages**: Naye courses banane ke liye `src/pages/CourseBuilder.jsx`.
- **Backend Flow**: API routes backend ke `routes/course.js` aur `routes/assignment.js` se chalte hain.
- **Database Models Used**: `models/Course.js`, `models/Assignment.js`, `models/Submission.js`, `models/Progress.js`

### D) AI Assistant & Coding Hub (Students ke doubts solve karna)
- **Frontend Pages**: `src/pages/StudentAIHub.jsx`, iske alawa AI chat ka sidebar component `src/components/AIAssistantSidebar.jsx` me hai.
- **Backend Flow**: Frontend -> request `backend/routes/aiRoutes.js` (ya `ai.js`) -> ye function call karte hain `backend/controllers/aiController.js` ko jo Gemini / OpenAI API se baat karta hai karke jawab laata hai.

### E) Live Classroom (Online video/chat sessions)
- **Frontend Pages**: `src/pages/LiveClassroom.jsx` aur classroom manage karne ke liye `src/components/ClassManager.jsx` & `ClassDetail.jsx`.
- **Backend Flow**: APIs `backend/routes/liveClass.js` aur `backend/routes/classRoutes.js` me hain (controller logic `classController.js` me). Realtime socket chat aur presence connection `backend/server.js` ke socket functions dwara handle hoti hai.

---

## 4. 📁 Folder Structure Kaisa Hai Aur Kaise Kaam Karta Hai?

Aapka poora Project 2 bade hisson me divided hai: **`frontend`** aur **`backend`**.
Main command jab aap `npm run dev` chalate hain, toh dono folders alag-alag port par start hote hain.

### 🎨 Frontend (`frontend/` directory)
Yahan React app ka sara code rehta hai jo user ko dikhta hai. Iska workflow:
- `index.html`: Web page ka skeleton (base).
- `src/main.jsx`: React framework ki entry file jo browser me app ko render (dikhati) karti hai.
- `src/App.jsx`: Yahan router (URLs) define hote hain ki `/login` par Login page khulega aur `/dashboard` par user dashboard.
- **`src/pages/`**: Website ke bade screens / pages (jaise `Login`, `CourseBuilder`, `TeacherDashboard`). Ek page matlab ek puri web screen. Keval yahi files sidhe route module me aate hain.
- **`src/components/`**: Ye chhote reusable parts hote hain. Agar ek custom button, widget ya sidebar (`AIAssistantSidebar.jsx`) aapko har page par chahiye, toh use naya component banakar page me daala jata hai taki codebase dohrana (repeat) na pade.
- **`src/assets/`**: Static cheezein jaise project ki Photos, Icons, wagaira yahan aati hain.
- **`vite.config.js`**: Frontend build hone ka engine, aur APIs ke proxy rules is file me set hain.

### ⚙️ Backend (`backend/` directory)
Ye system ka pichla server hissa (engine) hai jo Database ya logic sambhalta hai.
- **`server.js`**: **Main dil / entry point**. Ye Express setup karta hai, database start karta hai, cors set karta hai aur frontend ki sabhi aane wali requests `/api/...` ko unke sahi routes par bhejta hai. Web sockets (live chat) bhi idhar initialization receive karte hain.
- **`models/`**: Yeh MongoDB ke Schema / blueprint ko define karte hain. Jaise ki "User nam ke model mein email jaroori hai, password ka type string hoga, aur default role kya hoga?" (`User.js`, `Course.js` etc).
- **`routes/`**: Yeh API ke raston ka map hain. Jab API request aati hai, tab route file pata lagati hai aage kaya action lena hai.
- **`controllers/`**: Sahi logic yahin hota hai. Models aur Routes ke beech ka bridge. Models ko query bhejke, database se information lana ya save karwana.
- **`middleware/`**: Ye security check-point ki tarah kaam karte hain. Jaise jab frontend request aati hai ki `admin dashboard dikhao`, to auth-middleware check karega ki token vaakai `Admin` role wala hai ya nahi. Agar sahi token hai tab request controller me enter hoti hai, nahi hai to 401 error.
- **`.env`**: Project passwords, database url aur AI keys yahan save hoti hain taaki inko open web par hack na kiya ja sake.
- **`uploads/`**: User dwara upload kiye files ya documents is folder me as a default memory store ho sakte hain.
- **`scripts/`**: Is ke andar debugging aur small internal testing checks ki command scripts files hoti hain jinko aap manual database modify karne ya external services setup test karne ke liye run karte hain.

### ▶️ Final Data Flow Action (Web par Data kaise ghumta hai):
`Browser me User Action (Frontend React Button Click)` 
**-->** `Axios ne Backend ko Request send kari (/api/... par)` 
**-->** `Backend me server.js route request receive karta hai` 
**-->** `Vahan se request Middleware -> Controller function ko jati hai` 
**-->** `Controller Mongoose model dwara Database se connection aur changes (Read/Write) karta hai` 
**-->** `Controller ne Response (Data JSON) waapis Frontend ko bheja` 
**-->** `React ne update receive kara aur apni Screen/Page automatically refresh/render kardi.`
