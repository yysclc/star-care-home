export const DAILY_TALK_POOL = [
  {
    id: 'dt1',
    text: '老师，我家孩子最近在照护所表现得挺安稳的，回家也没那么焦虑了，谢谢。',
    options: [
      { label: '看到孩子能平稳过渡我们也很有成就感，会继续观察他的情绪变化。', good: true },
      { label: '这是我们应该做的，保持环境的预见性对 ASD 孩子很重要。', good: true },
      { label: '嗯，知道了，我们会维持现状。', good: false }
    ],
    goodReply: '谢谢老师，有您在我们就放心了。',
    badReply: '呃...好吧。'
  },
  {
    id: 'dt2',
    text: '老师，孩子今天回家说在照护所的感统活动玩得很开心。',
    options: [
      { label: '他今天在平衡木上的尝试确实有很大进步。', good: true },
      { label: '开心就好，这种良性刺激对他很有帮助。', good: true },
      { label: '别玩太疯了，要注意安全。', good: false }
    ],
    goodReply: '是啊，孩子现在可喜欢去照护所了。',
    badReply: '我们会提醒他的。'
  },
  {
    id: 'dt3',
    text: '老师，我给孩子买了一些新的视觉提示卡，您看在照护所能用上吗？',
    options: [
      { label: '当然可以，非常欢迎资源共享，这能帮助他更好地理解流程。', good: true },
      { label: '可以带来让他尝试一下，我们会协同使用的。', good: true },
      { label: '照护所里的提示卡已经够全面了。', good: false }
    ],
    goodReply: '好哒，我明天让孩子带过去。',
    badReply: '好吧，那我们就留着自己看。'
  },
  {
    id: 'dt4',
    text: '老师，周末带孩子出门，他总是因为环境吵闹崩溃，您有什么建议吗？',
    options: [
      { label: '建议准备降噪耳机，并提前用视觉卡片做社交故事预热。', good: true },
      { label: '我们可以共同制定一个家庭外出计划表试试看。', good: true },
      { label: '尽量少带他去人多的地方吧。', good: false }
    ],
    goodReply: '好的，听您的专业建议。',
    badReply: '孩子平时已经够累了，这些太复杂了。'
  },
  {
    id: 'dt5',
    text: '老师，辛苦了！感觉最近你们为了孩子的干预方案费了不少心。',
    options: [
      { label: '看到孩子的每一个微小进步，我们的付出都是值得的。', good: true },
      { label: '谢谢理解，家校共育的配合也是成功的关键。', good: true },
      { label: '确实挺累的，ASD 照护压力确实大。', good: false }
    ],
    goodReply: '老师真是负责任，我们会全力配合。',
    badReply: '那您先忙吧。'
  }
];

export const PARENT_COMPLAINT_POOL = [
  {
    id: 'pc1',
    text: '老师，孩子今天回家身上有抓痕，是不是在照护所和其他孩子起冲突了？',
    options: [
      { label: '非常抱歉，当时他在社交互动中产生了误解，我们会加强情绪安抚和引导。', good: true },
      { label: '我们会重新评估活动中的安全距离，确保后续的支持更到位。', good: true },
      { label: 'ASD 孩子互动时难免会有肢体摩擦，很正常。', good: false }
    ],
    goodReply: '老师态度诚恳，我们理解情况的复杂性。',
    badReply: '怎么能这么说呢？孩子受伤了我们很心疼。'
  },
  {
    id: 'pc2',
    text: '老师，今天照护所的活动流程是不是变了？孩子回家后情绪一直很焦虑。',
    options: [
      { label: '确实有微调，很抱歉没提前给孩子做视觉预告，我们会补上相关引导。', good: true },
      { label: '我能理解这种变动对他的影响，明天我们会重点安抚他的情绪。', good: true },
      { label: '偶尔的小变动也是为了锻炼他的适应能力。', good: false }
    ],
    goodReply: '原来是这样，我们会配合在家做安抚。',
    badReply: '我们只是担心突发变动会让他崩溃。'
  },
  {
    id: 'pc3',
    text: '老师，我发现孩子的辅食盒找不到了，是在照护所弄丢了吗？',
    options: [
      { label: '我马上帮您在照护区的收纳柜找找，稍后反馈给您。', good: true },
      { label: '可能落在哪个活动区域了，我会留意的，请别担心。', good: true },
      { label: '让他自己养成收拾东西的习惯，不能总靠我们。', good: false }
    ],
    goodReply: '麻烦老师了。',
    badReply: '我们只是想找回东西。'
  },
  {
    id: 'pc4',
    text: '老师，为什么今天的活动照片里没看到我家孩子参与集体游戏？',
    options: [
      { label: '当时他处于自我调节状态，我们尊重他的意愿，提供了平行游戏的替代。', good: true },
      { label: '我们在引导他逐步融入，这需要一个过程，稍后我会跟您详细沟通。', good: true },
      { label: '拍照时他刚好走开了，没法照顾到所有人。', good: false }
    ],
    goodReply: '原来有特殊考虑，谢谢老师解释。',
    badReply: '我们就感觉孩子被边缘化了。'
  },
  {
    id: 'pc5',
    text: '老师，孩子今天在照护所是不是没喝多少水？回家嘴唇干得厉害。',
    options: [
      { label: '了解，我们会加强视觉提醒，并在他的个别化支持计划里增加饮水频率。', good: true },
      { label: '感谢反馈，我们会关注他的饮水习惯，确保在活动间隙得到补充。', good: true },
      { label: '饮水台是开放的，他可以随时去喝。', good: false }
    ],
    goodReply: '好的，辛苦老师多费心。',
    badReply: '孩子主动性差，需要更多引导。'
  }
];
