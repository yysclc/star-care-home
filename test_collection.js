// testCollection.js
// 测试收集系统的辅助脚本（适配 CG + 画作两类）

// ── 测试1：添加所有收集品（开发者测试用）────────────────────
function testCollectAll() {
  const gs = JSON.parse(localStorage.getItem('asd_save') || '{}');
  gs.collections = gs.collections || {};
  gs.collections.items = gs.collections.items || {};
  
  // 添加所有收集品（CG + 画作）
  const allItems = [
    'cg_office_first',
    'cg_dream_entrance',
    'cg_painting_room',
    'cg_outdoor_yard',
    'artwork_orange_sun',
    'artwork_wood_ball',
    'artwork_color_mix',
    'artwork_clay_animal',
  ];
  
  allItems.forEach(id => {
    gs.collections.items[id] = { obtainedAt: Date.now() };
  });
  
  localStorage.setItem('asd_save', JSON.stringify(gs));
  console.log('✅ 已添加所有收集品！刷新页面查看效果。');
  console.log('收集进度：8 / 8 (100%)');
}

// ── 测试2：添加部分收集品 ──────────────────────────────
function testCollectSome() {
  const gs = JSON.parse(localStorage.getItem('asd_save') || '{}');
  gs.collections = gs.collections || {};
  gs.collections.items = gs.collections.items || {};
  
  // 添加部分收集品
  gs.collections.items['cg_office_first'] = { obtainedAt: Date.now() };
  gs.collections.items['cg_dream_entrance'] = { obtainedAt: Date.now() };
  gs.collections.items['artwork_orange_sun'] = { obtainedAt: Date.now() };
  gs.collections.items['artwork_wood_ball'] = { obtainedAt: Date.now() };
  
  localStorage.setItem('asd_save', JSON.stringify(gs));
  console.log('✅ 已添加 4 个收集品！刷新页面查看效果。');
  console.log('收集进度：4 / 8 (50%)');
}

// ── 测试3：清除所有收集品 ──────────────────────────────
function testClearCollections() {
  const gs = JSON.parse(localStorage.getItem('asd_save') || '{}');
  gs.collections = gs.collections || {};
  gs.collections.items = {};
  
  localStorage.setItem('asd_save', JSON.stringify(gs));
  console.log('✅ 已清除所有收集品！刷新页面查看效果。');
  console.log('收集进度：0 / 8 (0%)');
}

// ── 测试4：查看当前收集进度 ──────────────────────────────
function testCheckProgress() {
  const gs = JSON.parse(localStorage.getItem('asd_save') || '{}');
  const items = gs.collections?.items || {};
  const obtained = Object.keys(items).filter(id => items[id]);
  
  console.log(`📊 当前收集进度：${obtained.length} / 8`);
  console.log('已收集的品：', obtained);
  
  if (obtained.length === 0) {
    console.log('提示：运行 testCollectSome() 或 testCollectAll() 来添加收集品');
  }
}

// ── 使用方法 ──────────────────────────────────────────
console.log(`
🎮 收集系统测试工具（CG + 画作）

使用方法：
1. 在浏览器中打开游戏
2. 按 F12 打开开发者工具
3. 在 Console 标签中粘贴上面的函数
4. 运行测试命令：

  testCollectAll()      // 收集所有物品（8个）
  testCollectSome()     // 收集部分物品（4个）
  testClearCollections() // 清除所有收集品
  testCheckProgress()    // 查看当前进度

5. 刷新页面，点击"收集图鉴"按钮查看效果
`);

// 自动运行进度检查
testCheckProgress();
