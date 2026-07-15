import os

# Read the file
with open('WEEK7_STORY.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the orange subplot section
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '## 橙橙支线：回来以后' in line:
        start_idx = i
    if start_idx is not None and i > start_idx and line.strip() == '## 结算前剧情':
        end_idx = i
        break

print(f'start_idx: {start_idx}')
print(f'end_idx: {end_idx}')
print(f'total lines: {len(lines)}')

if start_idx is not None and end_idx is not None:
    # Write markers to a file
    with open('WEEK7_MARKERS.txt', 'w', encoding='utf-8') as f:
        f.write(f'START:{start_idx}\nEND:{end_idx}')
    print('Markers written to WEEK7_MARKERS.txt')
else:
    with open('WEEK7_MARKERS.txt', 'w', encoding='utf-8') as f:
        f.write('NOT_FOUND')
    print('Markers NOT found!')
