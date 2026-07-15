import sys

# Read the file
with open('WEEK7_STORY.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the insertion point: the line with "---" followed by empty line then "## 结算前剧情"
# From grep: "## 结算前剧情" is at line 316 (1-indexed), so index 315 (0-indexed)
# Looking at content: line 314 (0-indexed=313) is "---", line 315 (0-indexed=314) is empty, line 316 (0-indexed=315) is "## 结算前剧情"

insertion_point = None
for i, line in enumerate(lines):
    if line.strip() == '## 结算前剧情':
        insertion_point = i
        break

if insertion_point is None:
    print("ERROR: Could not find '## 结算前剧情'")
    sys.exit(1)

print(f"Insertion point found at line {insertion_point + 1} (0-indexed: {insertion_point})")

# The content to insert (between Orange subplot and 结算前剧情)
# Goes after the "---" and empty line before "## 结算前剧情"
# Looking at the file: the "---" is at index 312, empty line at 313, "## 结算前剧情" at 315

# Actually, let me search more carefully
for i in range(max(0, insertion_point - 10), insertion_point + 1):
    print(f"  Line {i+1}: {repr(lines[i])}")

# The new content to insert before "## 结算前剧情"
new_content = '''
---

### 节点6：父亲来了

（背景：library.png）

傍晚，离家长来接的时间还有大概二十分钟。

橙橙还在图书室的角落里。她没有在画，只是坐在椅子上，耳机戴着，画夹合上放在桌角。

你在门口坐着，看到走廊里出现了一个身影。

是橙橙的父亲。

他站在图书室门口，往里面看了一眼。他的目光先找到了橙橙，然后在房间里扫了一圈，最后落在你身上。

他没有马上走进来。

你在心里想了一下这周发生过的事：如果第六周完成了《橙橙支持档案》，如果今天橙橙把画留在了桌上——父亲看到那张画，会怎么理解它？

如果第六周没有完成档案，如果今天橙橙没有把画留在桌上——父亲这次来，会不会还是只问那句话："她有没有进步？"

---

（如果第六周完成了《橙橙支持档案》，且今天获得了画作《门边的人》：）

橙橙的父亲走进来。他走到桌子旁边，先看到了那张被推到桌子边缘的画纸。

他拿起来看了一眼。

画面上是一把椅子，椅边坐着一个人，人物和桌子之间隔着一段距离。

【橙橙父亲】这是……橙橙画的？

你点了一下头。

他把画纸转了一下，好像在找"正确"的看的方向。然后他又看了一眼。

【橙橙父亲】这个是……老师？

你点了一下头。

他沉默了一会儿。

【橙橙父亲】她画你坐在门边。

这不是问句。他是在确认自己看到了什么。

【你】对。她这周回来，发现绘画室旁边在施工，噪音很大，她没有办法在里面待着。我们就转到图书室角落。她确认了画夹的位置、纸盒的位置、耳机的位置，每一个都确认完，她才坐下来。

【橙橙父亲】这些我都看不出来。

【你】对。所以她画了。她把"确认完每一个位置"这件事，画成了那一段桌子和椅子之间的距离。那段距离不是"她不亲近"，是她在确认：你坐在那里，会不会突然过来。

橙橙的父亲把画纸翻过来，又翻过去，好像在找文字说明。

没有文字说明。

【橙橙父亲】医生那边说，她的听觉敏感指标比上次有改善。

【你】我知道。周嘉宁医生今天跟我们说了。

【橙橙父亲】那是进步了？

你看着他。

【你】你觉得呢。

他低头又看了一眼那张画。

【橙橙父亲】如果这是进步……我以前怎么没看到。

【你】她一直都在画。只是以前我们都在问"你画的是什么"，没有人问过"你为什么要画这个"。

橙橙的父亲把画纸小心地放回桌面上，朝橙橙的方向推了一下，推到桌子中间。

【橙橙父亲】我下次来，可以看吗。看她画。

【你】你可以坐在门边。

他点了一下头。

橙橙在角落里，把耳机摘下来一只，朝这边看了一眼，又戴回去了。

那是"我知道你还在"的意思。

---

（如果第六周没有完成《橙橙支持档案》，或今天没有获得画作：）

橙橙的父亲走进来。他往橙橙那个方向看了一眼，然后走过来，站在你旁边。

【橙橙父亲】这周怎么样。

【你】她这周回来，绘画室旁边在施工，噪音很大。我们转到图书室角落，她需要一点时间确认每一样东西在哪里。

【橙橙父亲】她有画吗？

你愣了一下。

今天橙橙没有把画留在桌上。如果第六周没有完成档案，你可能没有提前做变化预告，她今天没有坐下来画，或者她画了但没有留给你。

【你】她今天没有把画留下来。

橙橙的父亲沉默了一下。

【橙橙父亲】那我怎么知道她有没有进步。

你在心里想：你怎么知道她有没有进步？不是看她有没有把画留下来，而是看她回来的时候，有没有停下来确认东西在哪里，有没有在噪音变大的时候把耳机戴上，有没有在确认完以后坐下来。

但这些你都说不出口，因为你没有记录，没有档案，你甚至不确定她今天到底有没有坐下来画。

【橙橙父亲】医生那边说，指标有改善。但我在照护所里，看不到。

他的这句话，你没办法反驳。

因为如果第六周没有完成《橙橙支持档案》，你这周拿不出任何东西给他看——没有变化预告卡，没有流程卡片，没有画作，只有你说的一句"她在确认东西在哪里"。

这句话，抵不过一份评估报告上的数据。

【橙橙父亲】我还在考虑，要不要换一家。

他的声音不大，但图书室很安静，橙橙应该听到了。

你没有说话。

【橙橙父亲】不是我不信任这里。是我需要知道，她在这里，是不是真的在进步。

你点了一下头。

【你】我理解。

橙橙的父亲走过去，把书包从地上拎起来，叫了橙橙一声。橙橙把画夹合上，抱起来，跟着他走了。

她走到门口的时候，回头看了一眼桌子。

桌子上是空的。

---

'''

# Insert the new content before "## 结算前剧情"
# We want to insert after the "---" and empty line, so we keep those and add new content before "## 结算前剧情"
# Actually, let's just insert the new content right before "## 结算前剧情"

lines.insert(insertion_point, new_content)

# Write back
with open('WEEK7_STORY.md', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Successfully inserted father scene before line {insertion_point + 1}")
print(f"Total lines now: {len(lines)}")
