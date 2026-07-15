with open('WEEK7_STORY.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find markers
start = content.find('## 橙橙支线：回来以后')
end = content.find('\n## 结算前剧情')

print('start:', start)
print('end:', end)
