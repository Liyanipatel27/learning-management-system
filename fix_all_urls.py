import os

base_dir = r'e:\lms\frontend\src\pages'
files = [
    'VerifyOTP.jsx',
    'TeacherDashboard.jsx',
    'StudentDashboard.jsx',
    'ResetPassword.jsx',
    'Login.jsx',
    'LiveClassroom.jsx',
    'ForgotPassword.jsx',
    'AdminDashboard.jsx'
]

bad_line = "const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';"
good_line = "const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';"

# For VerifyOTP which has .replace
bad_line_otp = "const API_URL = (import.meta.env.VITE_API_URL || '${API_URL}').replace(/\/api$/, '');"
good_line_otp = "const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');"

for f in files:
    path = os.path.join(base_dir, f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = content.replace(bad_line, good_line)
        content = content.replace(bad_line_otp, good_line_otp)
        
        # Also catch any mismatched quotes in axios calls just in case
        # Example: `${API_URL}/api/auth/login'
        import re
        content = re.sub(r'`\$\{API_URL\}/api/([^\'"]+)\'', r'`${API_URL}/api/\1`', content)
        content = re.sub(r'`\$\{API_URL\}/api/([^\'"]+)"', r'`${API_URL}/api/\1`', content)
        
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Processed {f}")
 Riverside
