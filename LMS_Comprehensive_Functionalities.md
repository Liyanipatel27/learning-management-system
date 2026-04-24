# LMS Comprehensive Functionalities (A to Z Guide)

This document provides a detailed breakdown of every feature and functionality available in the Learning Management System for Admins, Teachers, and Students.

---

## 🛠 Admin Functionalities: Control & Oversight

The Admin has the highest level of authority and oversees the entire system, users, and educational content.

### 1. Dashboard & Global Metrics
- **System Overview**: Instantly view total counts for Students, Teachers, Active Courses, and Total Enrollments.
- **Quick Access Panel**: One-click actions for posting announcements, manual user creation, and bulk Excel imports.
- **Announcement Monitoring**: View and manage all live system-wide announcements.

### 2. User Management (The Core Control)
- **Multi-Role User List**: View, search, and filter all registered users by their roles (Admin, Teacher, Student).
- **Manual User Creation**: Create individual accounts with specific data points like Enrollment ID (for Students) or Employee ID (for Teachers/Admins).
- **Bulk Import (Excel Power Tool)**:
  - Download specialized sample Excel templates for Students and Teachers.
  - Upload filled Excel files to register hundreds of users instantly.
  - Set a default common password for all imported users.
- **Account Security**:
  - Reset any user's password manually.
  - Monitor account branch and ID connectivity.
- **Profile Editing**: Modify any user's personal details, IDs, or system roles.
- **Account Deletion**: Permanently remove users from the ecosystem.
- **Data Portability**: Export the entire Student or Teacher directory as a `.csv` file for offline use.

### 3. Course Oversight & Publishing
- **Global Course Directory**: View every course created in the system, regardless of the teacher.
- **Master Content Inspection**: A specialized "View Content" modal allows Admins to inspect chapters, modules, videos, and quizzes without enrolling.
- **Publishing Safeguard**: Admins can force-unpublish courses, making them invisible to students if they don't meet quality standards.

### 4. Advanced Analytics & Reporting
- **Student Progress Matrix**: View detailed completion percentages, course counts, and progress bars for every student.
- **Teacher Portfolio Tracking**: Monitor how many courses each teacher has uploaded and view their subject lists.
- **Automated Export**: Download progress and portfolio reports as Excel-compatible files.

### 5. System Communications
- **Targeted Announcements**: Send broadcast messages to "Everybody," "Students Only," or "Teachers Only."
- **Announcement Lifecycle Management**: Create, view, and delete announcements from the dashboard.

---

## 🎓 Teacher Functionalities: Content & Pedagogy

Teachers manage the learning experience, from course creation to live interaction and grading.

### 1. Teacher Command Center (Dashboard)
- **Instructional Stats**: View "Active Courses," "Drafts," and "Pending Grading" (assignments needing review).
- **Notice Board Access**: Real-time viewing of official announcements from the Admin.
- **Quick Start Actions**: Dedicated button to jump straight into the Course Builder.

### 2. Dynamic Course Builder
- **Flexible Hierarchy**: Organize learning into a "Subject -> Chapters -> Modules" structure.
- **Rich Media Support**: Upload and serve multiple content types:
  - **Videos**: High-quality lecture uploads via Cloudinary.
  - **PDFs & Documents**: For study materials and readings.
  - **Images**: For visual aids.
  - **External Links**: curated web resources.
  - **Subject Categorization**: Assign subjects to specific developmental categories.
- **Intelligent Quiz Suite**:
  - **AI Quiz Generation**: Use AI to automatically draft questions based on course topics.
  - **Manual Question Bank**: Create custom MCQ questions with multi-option support.
  - **Granular Settings**: Define passing scores (%), time limits, and difficulty levels (Easy, Medium, Hard) per quiz.
- **State Management**: Toggle courses between "Draft" (private) and "Published" (live for students) modes.

### 3. Assignment & Coding Lab
- **Assignment Architect**: Create general "File Upload" tasks or advanced "Coding Labs."
- **Pro Coding Environment**: 
  - Supports JavaScript, Python, Java, and C++.
  - Teachers provide "Starter Code" to guide students.
  - Define "Test Cases" (Input vs. Output) for automated logic verification.
- **Deadlines & Points**: Set specific due dates and maximum scores for every task.
- **Grading Workflow**:
  - View all submissions by student and status.
  - **Live Code Execution**: Run student-submitted code directly in the teacher's dashboard to verify logic.
  - **Feedback Loop**: Assign scores and provide detailed written feedback to students.
- **Submission Export**: Download student submission data to Excel.

### 4. Live Virtual Classroom
- **Instant Class Creation**: Start a live video session with a single click.
- **Room Management**: Automatic generation of unique Room IDs for secure student access.
- **Session Control**: Full power to start, join, or end live classes.
- **Lecture History**: Review previous live sessions for record-keeping.

### 5. Student Tracking & Performance
- **Registered Student Directory**: View all students enrolled under the teacher's profile.
- **Academic Performance Dashboard**: Filter by course to view every student's quiz scores and pass/fail status.
- **Completion Reports**: Detailed view of student progress bars and course mastery levels.

### 6. Classroom Announcements
- **Personal Broadcasts**: Teachers can send specific announcements to their students.
- **Management**: Ability to edit or delete their own posted messages.

### 7. Core Profile & Security
- **Identity Display**: Profile shows Name, Employee ID, and Role.
- **Avatar System**: Initial-based color avatars for quick identity.
- **Logout Management**: Secure session termination across all tabs.

---

## 🎒 Student Functionalities: Learning & Growth

Students have a premium, focused interface designed to maximize learning efficiency.

### 1. Student Command Center (Personalized Dashboard)
- **Role-Based Stats**: View "Enrolled Courses" and "Pending Assignments" counts at a glance.
- **Smart Notifications**:
  - **Daily Study Goals**: Alerts if daily study targets (time-based) aren't met.
  - **Deadline Alerts**: Dynamic warnings for assignments due within 48 hours or overdue tasks.
- **Auth & Recovery**:
  - **OTP-Based Password Reset**: Highly secure "Forgot Password" flow using email-based OTP verification.
- **Cinema Mode**: A unique global toggle to hide the sidebar and focus entirely on learning content.

### 2. Immersive Course Experience
- **Structured Learning Viewer**:
  - Sidebar navigation for Chapters and Modules.
  - Progress checks for every content item.
- **Focal-Point Study Timer**: 
  - Advanced tracking system that monitors time spent on each lesson.
  - **Tab-Activity Awareness**: The timer automatically pauses if the student switches tabs or minimizes the window to ensure honest study hours.
  - **Minimum Requirement**: Quizzes remain locked until a minimum percentage of study time is achieved.
- **Built-in Content Viewers**: Native support for Videos, PDFs, and Documents without leaving the LMS.
- **Two-Tier Quiz System**:
  - **Standard Quiz**: Comprehensive testing of the entire module.
  - **Fast Track (Shortcut)**: High-difficulty quiz that allows students to skip modules if they already master the topic.
  - **Weighted Difficulty**: Quizzes automatically pull a balanced mix of Easy, Medium, and Hard questions.

### 3. AI Learning Assistant
- **Document Summarization**: AI-powered tool to summarize long PDF/Word study materials.
- **AI Doubt Solver**: Ask questions about the module content and get instant AI-generated answers.
- **Quick Practice**: Ask the AI to generate practice questions on the fly.

### 4. Assignments & Pro Coding Lab
- **Submission Portal**: Track "Not Started," "Submitted," and "Graded" assignments.
- **Advanced Code Editor**: 
  - Syntax highlighting for multiple languages (JS, Python, Java, C++).
  - **Run Code**: Test logic against custom user inputs.
  - **Run Tests**: Validate the solution against the teacher's private test cases before final submission.
- **Feedback Center**: view teacher comments and scores on graded work.

### 5. Live Classes
- **Join Session**: Access live lectures initiated by teachers with a single click.

### 6. Progress, Certification & Career
- **AI Career Roadmap**: Set Daily/Weekend study goals (hours) and track progress against career-based learning paths.
- **Grade-Book**: A complete history of all quiz and assignment scores across all subjects.
- **Automated Certification**: Instantly download professional, verifiable PDF certificates upon 100% completion of a course.

### 7. Communication & Identity
- **Notice Board**: Stay informed via Admin and Teacher announcements.
- **Profile Management**: View personal details, Enrollment ID, and branch information.

---
*Created by LMS Documentation Team*
