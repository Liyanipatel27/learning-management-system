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

# Standard API_URL line
clean_api_url = "const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';"

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        # Fix the API_URL definition line
        if "const API_URL =" in line:
            # Replace the whole line with our clean version
            # Preserve indentation if any
            indent = line[:line.find("const")]
            # Check if it has the .replace... part
            if ".replace(" in line:
                new_lines.append(f"{indent}const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');\n")
            else:
                new_lines.append(f"{indent}{clean_api_url}\n")
            continue
            
        # Fix mismatched axios/fetch calls
        # Replace `${API_URL}/api/... ' and `${API_URL}/api/... " with `${API_URL}/api/...`
        # We need to be careful with regex here.
        
        # Pattern: axios.(post|get|put|patch|delete)(` ${API_URL}/api/something'
        # Or variations of it.
        
        # Simplified replacement for the exact broken patterns I saw:
        line = line.replace("`${API_URL}/api/auth/login',", "`${API_URL}/api/auth/login`,")
        line = line.replace("`${API_URL}/api/auth/verify-otp',", "`${API_URL}/api/auth/verify-otp`,")
        line = line.replace("`${API_URL}/api/auth/verify-otp\",", "`${API_URL}/api/auth/verify-otp`,")
        
        # Actually, let's just look for any template literal that starts with ${API_URL} but ends with ' or "
        # regex for `${API_URL}/something' or `${API_URL}/something"
        # Since I'm using backticks for the string itself in my regex, I'll be careful.
        line = re.sub(r'`\$\{API_URL\}/api/([^\'"]+)[\'"]', r'`${API_URL}/api/\1`', line)
        
        # Handle cases where it's not starting with backtick but SHOULD be
        # 'http://localhost:5000/api' -> `${API_URL}/api`
        # This was part of my previous attempt which might have left some half-baked strings.
        
        new_lines.append(line)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

for f in files_to_fix:
    full_path = os.path.join(base_dir, f)
    if os.path.exists(full_path):
        fix_file(full_path)
        print(f"Fixed {f}")
 Riverside
