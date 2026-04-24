# LMS Project - Comprehensive Functionality & Module Mapping

This document details all functional modules of the Learning Management System, mapping specific features to their respective code implementations across the frontend and backend.

---

## 🏗️ 1. Core Infrastructure & Data Models
The foundation of the system, handling data persistence and external integrations.

| Component | Backend (Model/Utility) | Role |
| :--- | :--- | :--- |
| **User Model** | [User.js](file:///e:/lms/backend/models/User.js) | Stores credentials, roles (Student/Teacher/Admin), and profile data. |
| **Course Model** | [Course.js](file:///e:/lms/backend/models/Course.js) | Hierarchical structure: Courses > Chapters > Modules > Contents/Quizzes. |
| **Progress Model** | [Progress.js](file:///e:/lms/backend/models/Progress.js) | Tracks time spent, module completion, scores, and daily activity. |
| **Assignment Model** | [Assignment.js](file:///e:/lms/backend/models/Assignment.js) | Definitions for file-based and coding assignments. |
| **Submission Model** | [Submission.js](file:///e:/lms/backend/models/Submission.js) | Student uploads, code solutions, and instructor grades/feedback. |
| **Cloudinary Utility** | [cloudinaryHelper.js](file:///e:/lms/backend/utils/cloudinaryHelper.js) | Manages secure file uploads and deletions for course content. |

---

## 🔑 2. Authentication Module
Secure access control for all user types.

| Functionality | Backend Route | Frontend Page |
| :--- | :--- | :--- |
| **User Registration** | `POST /api/auth/register` [auth.js#L10](file:///e:/lms/backend/routes/auth.js#L10) | [Register.jsx](file:///e:/lms/frontend/src/pages/Register.jsx) |
| **Secure Login** | `POST /api/auth/login` [auth.js#L64](file:///e:/lms/backend/routes/auth.js#L64) | [Login.jsx](file:///e:/lms/frontend/src/pages/Login.jsx) |
| **JWT Verification** | [authMiddleware.js](file:///e:/lms/backend/middleware/authMiddleware.js) | [ProtectedRoute.jsx](file:///e:/lms/frontend/src/components/ProtectedRoute.jsx) |
| **Profile Fetching** | `GET /api/auth/profile/:id` [auth.js#L139](file:///e:/lms/backend/routes/auth.js#L139) | `ProfileSection` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |

---

## 🎓 3. Student Learning Module
The primary interface for students to learn, track progress, and earn certificates.

| Feature | Logic Location | Frontend Component |
| :--- | :--- | :--- |
| **Course Catalog** | `GET /api/courses` (Published only) | `fetchCourses` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Learning Portal** | [course.js#L373](file:///e:/lms/backend/routes/course.js#L373) (Fetch Progress) | `CourseViewer` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Time Tracking** | `POST /api/courses/:id/contents/:cid/progress` | `saveProgress` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Quiz Engine** | `POST /api/courses/:id/modules/:mid/submit-quiz` | `QuizViewer` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Code Runner** | `POST /api/assignments/execute` (Piston API) | `handleRunCode` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Certificate Gen** | Frontend-only (jsPDF) | `generateCertificate` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Gradebook** | [course.js#L532](file:///e:/lms/backend/routes/course.js#L532) | `GradesSection` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |

---

## �‍🏫 4. Instructor (Teacher) Module
Tools for content creation and performance monitoring.

| Feature | Backend Route | Frontend Page |
| :--- | :--- | :--- |
| **Course Builder** | [course.js#L251-369](file:///e:/lms/backend/routes/course.js#L251-369) | [CourseBuilder.jsx](file:///e:/lms/frontend/src/pages/CourseBuilder.jsx) |
| **Quiz Editor** | [course.js#L208](file:///e:/lms/backend/routes/course.js#L208) | `QuizEditor` in [CourseBuilder.jsx](file:///e:/lms/frontend/src/pages/CourseBuilder.jsx) |
| **Assignment Mgmt** | [assignment.js#L1-97](file:///e:/lms/backend/routes/assignment.js#L1-97) | [TeacherDashboard.jsx](file:///e:/lms/frontend/src/pages/TeacherDashboard.jsx) |
| **Grading Tool** | `PUT /api/assignments/grade/:id` | `handleGradeSubmission` in [TeacherDashboard.jsx](file:///e:/lms/frontend/src/pages/TeacherDashboard.jsx) |
| **Teacher Reports** | `GET /api/courses/grades/teacher/:id` | `GradesTable` in [TeacherDashboard.jsx](file:///e:/lms/frontend/src/pages/TeacherDashboard.jsx) |

---

## ⚙️ 5. Administrative Module
High-level management of users, content, and communications.

| Feature | Backend Route | Frontend Page |
| :--- | :--- | :--- |
| **User Controls** | `GET/POST/DELETE /api/admin/users` | `fetchUsers` in [AdminDashboard.jsx](file:///e:/lms/frontend/src/pages/AdminDashboard.jsx) |
| **Content Lifecycle**| `PUT /api/admin/courses/:id/publish` | `handleTogglePublish` in [AdminDashboard.jsx](file:///e:/lms/frontend/src/pages/AdminDashboard.jsx) |
| **Global Analytics**| `GET /api/admin/reports/student-progress` | `fetchStudentReports` in [AdminDashboard.jsx](file:///e:/lms/frontend/src/pages/AdminDashboard.jsx) |
| **Announcements** | `POST /api/admin/announcements` | `handlePostAnnouncement` in [AdminDashboard.jsx](file:///e:/lms/frontend/src/pages/AdminDashboard.jsx) |

---

## 🤖 6. Smart Features (AI)
Advanced features leveraging generative AI.

| Feature | status | Frontend Trigger |
| :--- | :--- | :--- |
| **Career Roadmap** | `POST /api/ai/generate-roadmap` (Pending Config) | `RoadmapSection` in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
| **Study Assistant** | Frontend Sidebar ready | `isGeneratingSummary` state in [StudentDashboard.jsx](file:///e:/lms/frontend/src/pages/StudentDashboard.jsx) |
