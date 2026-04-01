import re

# ------------- Fix server.js -------------
with open('busTaams_server/server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# Strip out the markers
server_content = re.sub(r'<<<<<<< HEAD\n', '', server_content)
server_content = re.sub(r'=======\n', '', server_content)
server_content = re.sub(r'>>>>>>> 42314b4.*\n', '', server_content)
# We might need to make sure we don't have duplicated server binding logic, but since they were mostly different APIs, they can sit sequentially.

with open('busTaams_server/server.js', 'w', encoding='utf-8') as f:
    f.write(server_content)
print("server.js fixed")


# ------------- Fix App.jsx -------------
# Reading it chunk by chunk is easier but App.jsx has 4 conflicts.
# The simplest approach is to manually construct the final merged App.jsx.
# Let's read the full file to extract components we need to merge.
with open('busTaams_web/src/App.jsx', 'r', encoding='utf-8') as f:
    app_lines = f.readlines()

new_app = []
i = 0
while i < len(app_lines):
    line = app_lines[i]
    if line.startswith('<<<<<<< HEAD'):
        # Merge logic will be manual string replacement below
        pass
    new_app.append(line)
    i += 1
