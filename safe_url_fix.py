import os
import re

base_dir = r'e:\lms\frontend\src\pages'
files_to_fix = [
    'VerifyOTP.jsx',
    'TeacherDashboard.jsx',
    'StudentDashboard.jsx',
    'ResetPassword.jsx',
    'Login.jsx',
    'LiveClassroom.jsx',
    'ForgotPassword.jsx',
    'AdminDashboard.jsx'
]

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the API_URL definition - handle both with and without .replace
    content = content.replace("|| '${API_URL}'", "|| 'http://localhost:5000'")
    
    # Fix the common broken axios calls
    # Pattern: axios.post(`${API_URL}/api/auth/login', ...
    # Look for: `${API_URL}/api/ followed by anything NOT backtick/quote, then a single quote
    content = re.sub(r'\$\{API_URL\}/api/([^\'"`]+)\'', r'${API_URL}/api/\1`', content)
    # Also for double quotes just in case
    content = re.sub(r'\$\{API_URL\}/api/([^\'"`]+)\"', r'${API_URL}/api/\1`', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for f in files_to_fix:
    full_path = os.path.join(base_dir, f)
    if os.path.exists(full_path):
        fix_file(full_path)
        print(f"Fixed {f}")
 Riverside
