import os
import json

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(REPO_DIR, 'lessons_data.js')

def get_category(day_num):
    if day_num <= 15:
        return 'Basics & Conditionals'
    elif day_num <= 30:
        return 'Loops & Data Structures'
    elif day_num <= 50:
        return 'Functions, Modules & Files'
    elif day_num <= 70:
        return 'Object Oriented Programming'
    elif day_num <= 90:
        return 'Advanced Python & Modules'
    else:
        return 'Projects & Exercises'

lessons = []

entries = sorted(os.listdir(REPO_DIR))

for entry in entries:
    full_path = os.path.join(REPO_DIR, entry)
    if os.path.isdir(full_path) and not entry.startswith('.'):
        tut_dir = os.path.join(full_path, '.tutorial')
        tut_file_path = None
        if os.path.exists(tut_dir):
            for f in os.listdir(tut_dir):
                if f.lower().endswith('.md'):
                    tut_file_path = os.path.join(tut_dir, f)
                    break
        
        main_py_path = os.path.join(full_path, 'main.py')
        
        if tut_file_path and os.path.exists(tut_file_path):
            import re
            m = re.search(r'Day-?(\d+)', entry, re.IGNORECASE)
            if m:
                day_num = int(m.group(1))
            else:
                m2 = re.match(r'^(\d+)', entry)
                if m2:
                    day_num = int(m2.group(1))
                else:
                    day_num = 0
            
            with open(tut_file_path, 'r', encoding='utf-8', errors='ignore') as fh:
                raw_tut = fh.read()
            
            clean_lines = [line for line in raw_tut.split('\n') if 'Next Lesson' not in line]
            tut_content = '\n'.join(clean_lines).rstrip()
            
            title = entry.replace('-', ' ')
            lines = [l.strip() for l in tut_content.split('\n') if l.strip()]
            if lines and lines[0].startswith('#'):
                title = lines[0].lstrip('#').strip()
            
            code_content = ""
            if os.path.exists(main_py_path):
                with open(main_py_path, 'r', encoding='utf-8', errors='ignore') as fh:
                    code_content = fh.read()
            
            lessons.append({
                'day': day_num,
                'folder': entry,
                'title': title,
                'category': get_category(day_num if day_num else 1),
                'tutorial': tut_content,
                'code': code_content
            })

lessons.sort(key=lambda x: x['day'] if x['day'] is not None else 999)

print(f"Processed {len(lessons)} lessons.")

js_content = f"// Generated 100 Days of Code Data\nvar LESSONS_DATA = {json.dumps(lessons, indent=2, ensure_ascii=False)};\nif (typeof window !== 'undefined') {{ window.LESSONS_DATA = LESSONS_DATA; }}\n"

with open(OUTPUT_FILE, 'w', encoding='utf-8') as fh:
    fh.write(js_content)

print(f"Successfully generated {OUTPUT_FILE}")
