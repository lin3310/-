
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { GeminiService } from './gemini.service';

export type PipelineStep = 'vibe-entry' | 'crystallize' | 'refine-director' | 'check' | 'simulation' | 'final';

export interface StructuredPersona {
  appearance: string;
  personality: string;
  backstory: string;
  speechStyle: string;
  behaviors: string;
}

// NEW: Interface for the "Deep Remix" feature result
export interface RemixData {
  inner_voice: string;
  core_wound: string;
  secret_desire: string;
  worldview: string;
}

// NEW: The complete persona after a successful Remix
export interface RemixedPersona extends StructuredPersona, RemixData {}

export interface ConflictItem {
  severity: 'high' | 'medium' | 'low';
  cards: string[];
  description: string;
  suggestion: string;
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  groundingChunks?: GroundingChunk[];
}

export interface PersonaState {
  step: PipelineStep;
  vibeFragment?: string;
  vibeMessages: ChatMessage[];
  isModifying?: boolean;
  structuredPersona?: StructuredPersona;
  currentDraft: string;
  analysisReport?: ConflictItem[];
  simulationHistory: { role: 'user' | 'model'; text: string }[];
  simulationType: 'chat' | 'quotes';
  // NEW: State to hold the remixed data
  remixData?: RemixData;
}

// --- Data Structures for Inspiration Modal ---
export interface InspirationQuestion {
  id: string;
  text: string;
  type: 'standard' | 'color' | 'reference';
  example: string;
  placeholder?: string;
}

export interface InspirationCategory {
  id: string;
  icon: string;
  title: string;
  questions: InspirationQuestion[];
}

// --- Default Data ---
// UPDATED: Icons are now Material Symbol names instead of Emojis
const INITIAL_INSPIRATION_DATA: InspirationCategory[] = [
  {
    id: 'appearance',
    icon: 'palette',
    title: '外觀與第一印象',
    questions: [
      { id: 'app1', text: '用三個詞形容外表', type: 'standard', example: '冷酷、神秘、高挑\n溫柔、可愛、小隻\n帥氣、中性、俐落' },
      { id: 'app2', text: '給人什麼第一印象？', type: 'standard', example: '難以親近，但眼神很溫柔\n看起來總是沒睡飽的樣子\n非常有活力，像個小太陽' },
      { id: 'app3', text: '如果是顏色會是什麼？', type: 'color', example: '深海藍、暗紅色、薄荷綠...' },
      { id: 'app4', text: '穿衣風格是？', type: 'standard', example: '寬鬆舒適的運動風\n精緻、有層次的古著風\n非黑即白的極簡風格' },
      { id: 'app5', text: '有什麼顯眼的特徵？', type: 'standard', example: '眼角的淚痣\n銀白色的長髮\n一高一低的眉毛' },
    ]
  },
  {
    id: 'personality',
    icon: 'psychology',
    title: '性格與內在',
    questions: [
      { id: 'per1', text: '最大的性格特點？', type: 'standard', example: '極度樂觀，幾乎不會生氣\n超級懶，能不動就不動\n對不感興趣的事物非常冷漠' },
      { id: 'per2', text: '有什麼反差嗎？', type: 'standard', example: '外表強勢，但其實很會照顧人\n看起來很會玩，實際上是個宅男\n平常很安靜，但一提到喜歡的東西就滔滔不絕' },
      { id: 'per3', text: '最在意什麼事？', type: 'standard', example: '別人的看法\n自己的原則\n家人的安全' },
      { id: 'per4', text: '最害怕什麼？', type: 'standard', example: '失去重要的人\n無法達成目標\n被大家遺忘' },
      { id: 'per5', text: '開心時會做什麼？', type: 'standard', example: '會不自覺地哼歌\n找人分享，有點囉嗦\n自己一個人躲起來偷笑' },
      { id: 'per6', text: '生氣時的反應？', type: 'standard', example: '沉默不語，氣壓極低\n會說反話來諷刺\n直接爆發，但很快就消氣' },
    ]
  },
  {
    id: 'behavior',
    icon: 'gesture',
    title: '說話與行為',
    questions: [
      { id: 'beh1', text: '最常說的口頭禪？', type: 'standard', example: '「無聊死了」、「嘖，好煩」\n「欸～」「是說啊」\n「whatever」、「隨便啦」' },
      { id: 'beh2', text: '說話的語氣風格？', type: 'standard', example: '平鋪直敘，沒什麼情緒起伏\n語速很快，像連珠炮\n喜歡用很多形容詞，有點誇張' },
      { id: 'beh3', text: '習慣性的小動作？', type: 'standard', example: '思考時會轉筆\n緊張時會玩自己的頭髮\n說謊時眼神會往右上看' },
      { id: 'beh4', text: '最常做的事？', type: 'standard', example: '戴著耳機聽音樂\n觀察路邊的貓\n在咖啡廳看書' },
      { id: 'beh5', text: '遇到陌生人的反應？', type: 'standard', example: '保持距離，很有禮貌但疏遠\n主動搭話，自來熟\n有點害羞，不敢直視對方' },
    ]
  },
  {
    id: 'background',
    icon: 'history_edu',
    title: '背景與設定',
    questions: [
      { id: 'bg1', text: '有什麼特殊能力？', type: 'standard', example: '能跟動物溝通\n時間停止\n絕對不會迷路' },
      { id: 'bg2', text: '最重要的物品是？', type: 'standard', example: '一把從不離身的舊懷錶\n母親留下的項鍊\n一本寫滿筆記的書' },
      { id: 'bg3', text: '過去有什麼特殊經歷？', type: 'standard', example: '曾經環遊世界\n在某場意外中失去記憶\n被一個神秘組織追殺' },
      { id: 'bg4', text: '為什麼會在這裡？', type: 'standard', example: '為了尋找失散多年的兄弟\n逃離故鄉\n執行一項秘密任務' },
      { id: 'bg5', text: '有什麼秘密嗎？', type: 'standard', example: '其實是個機器人\n看得見別人看不見的東西\n背負著家族的血海深仇' },
      { id: 'bg6', text: '最想達成的目標？', type: 'standard', example: '成為世界第一的劍士\n開一間屬於自己的麵包店\n向某個人復仇' },
    ]
  },
  {
    id: 'relationships',
    icon: 'groups',
    title: '人際關係',
    questions: [
      { id: 'rel1', text: '如何對待朋友？', type: 'standard', example: '嘴上很毒，但會默默幫忙\n像個大家長一樣照顧大家\n朋友不多，但對每個都掏心掏肺' },
      { id: 'rel2', text: '對陌生人的態度？', type: 'standard', example: '基本上是無視\n保持警惕，但對方釋出善意就會回應\n友好，喜歡結交新朋友' },
      { id: 'rel3', text: '有重要的人嗎？', type: 'standard', example: '從小一起長大的青梅竹馬\n改變了自己人生的恩師\n亦敵亦友的競爭對手' },
      { id: 'rel4', text: '最不擅長應對誰？', type: 'standard', example: '哭哭啼啼的人\n過度熱情的人\n比自己強大太多的對手' },
    ]
  },
  {
    id: 'reference',
    icon: 'auto_stories',
    title: '靈感參考',
    questions: [
      { id: 'ref1', text: '有點像《___》的___', type: 'reference', example: '《咒術迴戰》的五條悟\n《鬼滅之刃》的富岡義勇\n《間諜家家酒》的約兒', placeholder: '有點像《' },
      { id: 'ref2', text: '結合___和___的感覺', type: 'reference', example: '炭治郎的溫柔和伊之助的野性\n卡卡西的慵懶和帶土的執著\n夏目貴志的溫柔與的場靜司的冷酷', placeholder: '結合了' },
      { id: 'ref3', text: '參考的音樂/電影？', type: 'standard', example: '電影《小丑》的氛圍\nRadiohead 的《Creep》\n古典樂，蕭邦的夜曲' },
      { id: 'ref4', text: '用三個抽象名詞形容：___', type: 'standard', example: '冰塊、迷宮、舊照片\n太陽、利刃、拉麵\n玫瑰、棋盤、月光', placeholder: '形容：' },
    ]
  }
];

// --- I18n & Theming Interfaces ---
export type Language = 'en' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko' | 'de' | 'es' | 'fr' | 'pt';
export type Theme = 'light' | 'slate' | 'dark' | 'black' | 'amoled';

const TRANSLATIONS = {
  en: {
    'common.back': 'Back',
    'common.next': 'Next',
    'common.finish': 'Finish',
    'common.loading': 'Loading...',
    'common.copy': 'Copy',
    'common.close': 'Close',
    'common.auto_fill': 'AI Auto-Fill',
    'common.ai_magic': 'AI Magic...',
    'common.start_over': 'Start Over',
    'common.copied': 'Copied to clipboard!',
    'common.confirm_restart': 'Are you sure you want to start over? Unsaved progress will be lost.',
    'common.create_new': 'Create New Persona',
    'common.compiling': 'Compiling...',
    'common.error.compilation_failed': 'Compilation failed. Please try again.',
    'common.error.connection_refused': 'ERR_CONNECTION_REFUSED',
    'common.error.request_failed': 'ERR_PROCESSING_REQUEST',
    'home.title': 'Persona Alchemy',
    'home.subtitle': 'Summon your unique AI character',
    'home.mode_vibe': 'Vibe Mode',
    'home.desc_vibe': "Just say what's on your mind. The AI will organize it into a character.",
    'home.mode_arch': 'Architect',
    'home.desc_arch': "Build a character with precision by filling out a detailed spec sheet.",
    'home.mode_tool': 'Tool',
    'home.desc_tool': "Create a functional AI assistant for a specific task.",
    'home.mode_director': 'Director Mode',
    'home.desc_director': "The AI interviews you like a director to deepen your character.",
    'home.mode_antibias': 'Anti-Bias',
    'home.desc_antibias': "Analyze text to uncover hidden logical blind spots.",
    'home.workflow_title': 'Creative Workflow',
    'home.workflow_desc': 'Start with a vague idea. Let the AI chat with you and explore concepts to shape a vivid character step-by-step.',
    'home.tools_title': 'Standalone Tools',
    'home.recommended': '(Recommended)',
    'vibe.title': 'Vibe Mode',
    'vibe.subtitle': 'Step 1: The Spark',
    'vibe.placeholder': 'Type anything... feelings, keywords, #tags',
    'vibe.inspiration': 'Need Inspiration?',
    'vibe.analyze_btn': 'Next Step',
    'vibe.intro_msg': 'Feel free to share anything... keywords, #tags, music, or abstract feelings...',
    'vibe.modify_msg': 'Welcome back. What would you like to adjust?',
    'vibe.sources': 'Sources',
    'vibe.compiling_desc': 'Structuring your ideas into a persona.',
    'inspiration.title': 'Search my mind...',
    'inspiration.search_placeholder': 'Search questions...',
    'inspiration.used_count': '✓ Used {count} questions',
    'inspiration.random_btn': 'Random Question',
    'inspiration.expand_library': 'Expand Library',
    'inspiration.expand_library_tooltip': 'AI will generate brand-new categories related to current events or trends and add them to the existing library.',
    'inspiration.optimize_library': 'AI Optimize',
    'inspiration.optimize_library_short': 'Optimize',
    'inspiration.optimize_library_tooltip': 'AI will review the entire library, remove outdated questions, update examples, and add deeper questions to improve overall quality.',
    'inspiration.ai_is_thinking': 'Muse is thinking...',
    'inspiration.error.unavailable': 'Sorry, the AI muse is unavailable right now.',
    'inspiration.confirm_btn': 'Confirm & Use',
    'inspiration.cancel_btn': 'Cancel',
    'inspiration.quick_add_toast': 'Added "{text}" to inspiration',
    'inspiration.daily_muse_toast': 'Daily inspiration has been updated!',
    'inspiration.remixing': 'Remixing...',
    'inspiration.example_label': 'Example:',
    'inspiration.remix_success_toast': 'Library Remixed & Updated!',
    'inspiration.reset_btn': 'Reset',
    'crys.title': 'Crystallize Vibe',
    'crys.subtitle': 'Review and refine the structured persona.',
    'crys.btn_modify': 'Modify Vibe',
    'crys.btn_refine': 'Deepen (Director)',
    'crys.btn_check': 'Review & Check',
    'crys.card_appearance': 'Appearance',
    'crys.card_personality': 'Personality',
    'crys.card_backstory': 'Backstory',
    'crys.card_speechStyle': 'Speech Style',
    'crys.card_behaviors': 'Behaviors',
    'crys.error.regeneration_failed': 'Regeneration failed',
    'crys.error.load_failed_title': 'Error',
    'crys.error.load_failed_desc': 'Could not load the structured persona.',
    'check.title': 'Consistency Check',
    'check.analyzing_desc': 'AI is reading through the persona, looking for contradictions and blind spots...',
    'check.good': 'Consistency: Good',
    'check.issues': 'Issues Detected',
    'check.btn_ignore': 'Ignore',
    'check.btn_fix': 'Auto Fix',
    'check.btn_feature': 'Make Feature',
    'check.btn_sim': 'Proceed to Simulation',
    'check.btn_remix': 'Deep Remix',
    'check.remix_modal.title': 'Persona Remix',
    'check.remix_modal.desc': 'The AI has added deeper psychological layers to your character. Review and accept these changes to enhance your persona.',
    'check.remix_modal.accept': 'Accept Remix',
    'check.remix_modal.field_inner_voice': 'Inner Voice',
    'check.remix_modal.field_core_wound': 'Core Wound',
    'check.remix_modal.field_secret_desire': 'Secret Desire',
    'check.remix_modal.field_worldview': 'Worldview',
    'check.items_found': '{count} item(s) found.',
    'check.issue_label': 'Issue:',
    'check.suggestion_label': 'AI Suggestion:',
    'check.error.action_failed': 'Action failed. Please try again.',
    'check.error.remix_failed': 'Remix failed. Please try again.',
    'sim.title': 'Simulation Deck',
    'sim.chat': 'Chat',
    'sim.quotes': 'Quotes',
    'sim.placeholder': 'Say something...',
    'sim.regenerate': 'Regenerate',
    'sim.finalize': 'FINALIZE & EXPORT',
    'sim.turns_label': 'Turns:',
    'sim.error_message': '[Error]',
    'final.title': 'Persona Crystallized',
    'final.subtitle': 'Ready for deployment.',
    'final.export_options': 'Export Options',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Text (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': 'Director Mode • Module 1-4',
    'director.sources': 'Sources',
    'director.error_offline': 'Director is offline. Please try again.',
    'director.finish_btn': 'Finish & Check',
    'director.skip_btn': 'AI Fill (Skip)',
    'director.skip_text': 'I have no idea for this one, please decide for me based on the character\'s vibe (Skip & Auto-fill)',
    'director.system.ready_prompt': 'System ready. Please introduce yourself briefly and ask the FIRST question only.',
    'director.system.compile_prompt': 'The interview is complete. Please compile the Final System Prompt now, strictly following the [Output Format] (Role Definition, Interaction Protocol, etc.).',
    'arch.title': 'Persona Architect',
    'arch.subtitle': 'Engineering School • Structured',
    'arch.step1': 'Identity',
    'arch.step2': 'Language',
    'arch.step3': 'Attitude',
    'arch.step4': 'Examples',
    'arch.step5': 'Blueprint',
    'arch.label_name': 'Name / Nickname',
    'arch.label_age': 'Age (Optional)',
    'arch.label_rel': 'Relationship with User',
    'arch.label_tags': 'Core Personality Tags',
    'arch.label_desc': 'Integrated Personality Description',
    'arch.label_lang': 'Primary Language',
    'arch.label_prof': 'Proficiency / Accent',
    'arch.label_tics': 'Verbal Tics / Secondary Language',
    'arch.label_style': 'Core Style of Primary Language',
    'arch.label_demeanor': 'General Demeanor',
    'arch.label_towards': 'Attitude Towards User',
    'arch.label_tone': 'Key Tone Words',
    'arch.label_examples': 'Example Phrases',
    'arch.label_trigger': 'Final Instruction (Trigger)',
    'arch.placeholder_tags': '#Tag1 #Tag2',
    'arch.placeholder_examples': 'Example 1: ...\nExample 2: ...',
    'arch.btn_generate': 'Generate Prompt',
    'arch.btn_refine': 'Refine with Director',
    'tool.title': 'Utility Core',
    'tool.subtitle': 'Functionalism • Protocol Design',
    'tool.placeholder': 'Respond to the core\'s query...',
    'tool.compile': '[COMPILE_INSTRUCTION_SET]',
    'tool.compile_prompt': 'Data collection complete. Output the final Utility Directive JSON/Block now.',
    'tool.btn_send': 'Execute',
    'tool.init_prompt': 'I need to define a new AI tool. Please guide me through the process.',
    'tool.sources': 'Sources',
    'antibias.title': 'Anti-Bias Core',
    'antibias.subtitle': 'Logic • Deconstruction',
    'antibias.placeholder': 'Describe a scenario or text to analyze...',
    'antibias.compile': '[DECONSTRUCT_BIAS]',
    'antibias.compile_prompt': 'Analysis is complete. Please provide the de-biased summary and recommendation now.',
    'antibias.init_prompt': 'I need to analyze something for psychological biases. Please start the deconstruction protocol.',
    'antibias.sources': 'Sources',
    'antibias.btn_unsure': 'Not Sure / Ambiguous',
    'antibias.unsure_prompt': 'I am not sure. It feels ambiguous. Please help me analyze the possibilities.'
  },
  'zh-TW': {
    'common.back': '返回',
    'common.next': '下一步',
    'common.finish': '完成',
    'common.loading': '載入中...',
    'common.copy': '複製',
    'common.close': '關閉',
    'common.auto_fill': 'AI 幫我補',
    'common.ai_magic': 'AI 施法中...',
    'common.start_over': '重新開始',
    'common.copied': '已複製到剪貼簿！',
    'common.confirm_restart': '確定要重新開始嗎？所有未儲存的進度將會遺失。',
    'common.create_new': '創建新角色',
    'common.compiling': '編譯中...',
    'common.error.compilation_failed': '編譯失敗，請重試。',
    'common.error.connection_refused': '錯誤：連線被拒',
    'common.error.request_failed': '錯誤：請求處理失敗',
    'home.title': '人格鍊成',
    'home.subtitle': '召喚你的專屬 AI 角色',
    'home.mode_vibe': '靈感模式',
    'home.desc_vibe': '想到什麼就說什麼，AI 幫你整理成角色。',
    'home.mode_arch': '架構師模式',
    'home.desc_arch': '像工程師一樣，精準填寫規格來打造角色。',
    'home.mode_tool': '工具模式',
    'home.desc_tool': '打造一個有特定功能的 AI 工具人。',
    'home.mode_director': '導演模式',
    'home.desc_director': 'AI 像導演一樣訪談你，挖掘角色深度。',
    'home.mode_antibias': '反偏誤模式',
    'home.desc_antibias': '分析一段話，看看有沒有隱藏的邏輯盲點。',
    'home.workflow_title': '創作流程',
    'home.workflow_desc': '從一個模糊的想法開始，讓 AI 陪你聊天、探索，一步步塑造出獨一無二的生動角色。',
    'home.tools_title': '獨立功能 & 工具',
    'home.recommended': '(推薦)',
    'vibe.title': '靈感模式',
    'vibe.subtitle': '第一步：捕捉火花',
    'vibe.placeholder': '隨便寫點什麼... 感覺、關鍵詞、#標籤',
    'vibe.inspiration': '沒靈感？試試看...',
    'vibe.analyze_btn': '下一步',
    'vibe.intro_msg': '有想到甚麼都可以寫上來喔, 無論是關鍵詞 #標籤 音樂或...',
    'vibe.modify_msg': '歡迎回來，想調整些什麼呢？',
    'vibe.sources': '資料來源',
    'vibe.compiling_desc': '正在將您的想法結構化為人格...',
    'inspiration.title': '挖掘我的思緒...',
    'inspiration.search_placeholder': '搜尋問題...',
    'inspiration.used_count': '✓ 已使用 {count} 題',
    'inspiration.random_btn': '隨機來一題',
    'inspiration.expand_library': '擴充題庫',
    'inspiration.expand_library_tooltip': 'AI 會產生全新的主題分類，並加入到現有題庫中，適合想尋找更多元靈感時使用。',
    'inspiration.optimize_library': 'AI 最佳化',
    'inspiration.optimize_library_short': '最佳化',
    'inspiration.optimize_library_tooltip': 'AI 會審視整個題庫，移除陳舊問題、更新範例，並加入更深刻的問題來提升整體品質。',
    'inspiration.ai_is_thinking': '繆斯思考中...',
    'inspiration.error.unavailable': '抱歉，AI 繆斯暫時無法連線。',
    'inspiration.confirm_btn': '確認使用',
    'inspiration.cancel_btn': '取消',
    'inspiration.quick_add_toast': '已將「{text}」加入靈感',
    'inspiration.daily_muse_toast': '每日靈感已更新！',
    'inspiration.remixing': 'Remix 中...',
    'inspiration.example_label': '例如：',
    'inspiration.remix_success_toast': '靈感庫已 Remix 並更新！',
    'inspiration.reset_btn': '重置',
    'crys.title': '靈感結晶',
    'crys.subtitle': 'AI 已整理您的想法，請檢視或調整。',
    'crys.btn_modify': '返回修改',
    'crys.btn_refine': '深度優化 (導演)',
    'crys.btn_check': '檢查一致性',
    'crys.card_appearance': '外觀',
    'crys.card_personality': '性格',
    'crys.card_backstory': '背景故事',
    'crys.card_speechStyle': '說話風格',
    'crys.card_behaviors': '行為模式',
    'crys.error.regeneration_failed': '重新生成失敗',
    'crys.error.load_failed_title': '錯誤',
    'crys.error.load_failed_desc': '無法載入結構化人格。',
    'check.title': '一致性檢查',
    'check.analyzing_desc': 'AI 正在深度閱讀人設，尋找矛盾點與思維盲區...',
    'check.good': '整體一致性：良好',
    'check.issues': '檢測到潛在問題',
    'check.btn_ignore': '忽略',
    'check.btn_fix': '自動修正',
    'check.btn_feature': '轉為特色',
    'check.btn_sim': '進入模擬測試',
    'check.btn_remix': '深度 Remix',
    'check.remix_modal.title': '人格 Remix',
    'check.remix_modal.desc': 'AI 為您的角色注入了更深層的心理維度。請檢視並接受這些變更，以強化您的角色。',
    'check.remix_modal.accept': '接受 Remix',
    'check.remix_modal.field_inner_voice': '內心戲',
    'check.remix_modal.field_core_wound': '核心創傷',
    'check.remix_modal.field_secret_desire': '隱藏渴望',
    'check.remix_modal.field_worldview': '世界觀',
    'check.items_found': '找到 {count} 個問題項目',
    'check.issue_label': '問題：',
    'check.suggestion_label': 'AI 建議：',
    'check.error.action_failed': '操作失敗，請重試。',
    'check.error.remix_failed': 'Remix 失敗，請重試。',
    'sim.title': '模擬測試平台',
    'sim.chat': '對話模擬',
    'sim.quotes': '語錄生成',
    'sim.placeholder': '說點什麼...',
    'sim.regenerate': '重新生成',
    'sim.finalize': '完成並匯出',
    'sim.turns_label': '回合數：',
    'sim.error_message': '[錯誤]',
    'final.title': '人格結晶',
    'final.subtitle': '準備部署',
    'final.export_options': '匯出選項',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Text (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': '導演模式 • 模組 1-4',
    'director.sources': '資料來源',
    'director.error_offline': '導演離線了，請稍後再試。',
    'director.finish_btn': '完成並前往檢查 (Check)',
    'director.skip_btn': 'AI 幫我補 (跳過)',
    'director.skip_text': '這題我沒想法，請根據角色感覺幫我決定 (Skip & Auto-fill)',
    'director.system.ready_prompt': '系統就緒。請簡短自我介紹，並只問第一個問題。',
    'director.system.compile_prompt': '訪談已完成。請嚴格依照 [輸出格式]（角色定義、互動協議等）編譯最終的系統提示。',
    'arch.title': '架構師模式',
    'arch.subtitle': '工程學派 • 結構化構建',
    'arch.step1': '核心身分',
    'arch.step2': '語言設定',
    'arch.step3': '態度情感',
    'arch.step4': '範例樣本',
    'arch.step5': '最終藍圖',
    'arch.label_name': '名稱 / 暱稱',
    'arch.label_age': '年齡 (選填)',
    'arch.label_rel': '與使用者的關係',
    'arch.label_tags': '性格關鍵詞',
    'arch.label_desc': '性格綜合描述',
    'arch.label_lang': '主要語言',
    'arch.label_prof': '熟練度 / 口音',
    'arch.label_tics': '口癖 / 第二語言',
    'arch.label_style': '主要語言風格',
    'arch.label_demeanor': '整體舉止神態',
    'arch.label_towards': '對使用者的態度',
    'arch.label_tone': '關鍵語氣詞',
    'arch.label_examples': '對話範例 (Few-Shot)',
    'arch.label_trigger': '最終AI指令',
    'arch.placeholder_tags': '#標籤1 #標籤2',
    'arch.placeholder_examples': '範例1: ...\n範例2: ...',
    'arch.btn_generate': '生成 Prompt',
    'arch.btn_refine': '接續導演模式',
    'tool.title': '工具核心',
    'tool.subtitle': '功能主義 • 協議設計',
    'tool.placeholder': '回應核心的提問...',
    'tool.compile': '[編譯指令集]',
    'tool.compile_prompt': '資料收集完成，請立即輸出最終的工具指令 JSON/Block。',
    'tool.btn_send': '執行',
    'tool.init_prompt': '我需要定義一個新的 AI 工具，請引導我完成整個流程。',
    'tool.sources': '資料來源',
    'antibias.title': '反偏誤核心',
    'antibias.subtitle': '邏輯 • 拆解分析',
    'antibias.placeholder': '描述一個情境或文本以進行分析...',
    'antibias.compile': '[解構偏誤]',
    'antibias.compile_prompt': '分析完成，請提供去偏誤總結與建議。',
    'antibias.init_prompt': '我需要分析一段內容中的心理學偏誤，請啟動解構協議。',
    'antibias.sources': '資料來源',
    'antibias.btn_unsure': '不確定 / 模稜兩可',
    'antibias.unsure_prompt': '我不確定，感覺有點模糊。請協助我分析可能的意圖。'
  },
  'zh-CN': {
    'common.back': '返回',
    'common.next': '下一步',
    'common.finish': '完成',
    'common.loading': '加载中...',
    'common.copy': '复制',
    'common.close': '关闭',
    'common.auto_fill': 'AI 帮我补全',
    'common.ai_magic': 'AI 施法中...',
    'common.start_over': '重新开始',
    'common.copied': '已复制到剪贴板！',
    'common.confirm_restart': '确定要重新开始吗？所有未保存的进度将会丢失。',
    'common.create_new': '创建新角色',
    'common.compiling': '编译中...',
    'common.error.compilation_failed': '编译失败，请重试。',
    'common.error.connection_refused': '错误：连接被拒',
    'common.error.request_failed': '错误：请求处理失败',
    'home.title': '人格炼成',
    'home.subtitle': '召唤你的专属 AI 角色',
    'home.mode_vibe': '灵感模式',
    'home.desc_vibe': '想到什么就说什么，AI 会帮你整理成角色。',
    'home.mode_arch': '架构师模式',
    'home.desc_arch': '像工程师一样，精确填写规格来打造角色。',
    'home.mode_tool': '工具模式',
    'home.desc_tool': '打造一个有特定功能的 AI 工具人。',
    'home.mode_director': '导演模式',
    'home.desc_director': 'AI 像导演一样访谈你，挖掘角色深度。',
    'home.mode_antibias': '反偏见模式',
    'home.desc_antibias': '分析一段话，看看有没有隐藏的逻辑盲点。',
    'home.workflow_title': '创作流程',
    'home.workflow_desc': '从一个模糊的想法开始，让 AI 陪你聊天、探索，一步步塑造出独一无二的生动角色。',
    'home.tools_title': '独立功能 & 工具',
    'home.recommended': '(推荐)',
    'vibe.title': '灵感模式',
    'vibe.subtitle': '第一步：捕捉火花',
    'vibe.placeholder': '随便写点什么... 感觉、关键词、#标签',
    'vibe.inspiration': '没灵感？试试看...',
    'vibe.analyze_btn': '下一步',
    'vibe.intro_msg': '想到什么都可以写上来喔，无论是关键词 #标签 音乐或...',
    'vibe.modify_msg': '欢迎回来，想调整些什么呢？',
    'vibe.sources': '资料来源',
    'vibe.compiling_desc': '正在将您的想法结构化为人格...',
    'inspiration.title': '挖掘我的思绪...',
    'inspiration.search_placeholder': '搜寻问题...',
    'inspiration.used_count': '✓ 已使用 {count} 题',
    'inspiration.random_btn': '随机来一题',
    'inspiration.expand_library': '扩充题库',
    'inspiration.expand_library_tooltip': 'AI 会生成全新的主题分类，并加入到现有题库中，适合想寻找更多元灵感时使用。',
    'inspiration.optimize_library': 'AI 最佳化',
    'inspiration.optimize_library_short': '最佳化',
    'inspiration.optimize_library_tooltip': 'AI 会审视整个题库，移除陈旧问题、更新范例，并加入更深刻的问题来提升整体品质。',
    'inspiration.ai_is_thinking': '繆斯思考中...',
    'inspiration.error.unavailable': '抱歉，AI 缪斯暂时无法连接。',
    'inspiration.confirm_btn': '确认使用',
    'inspiration.cancel_btn': '取消',
    'inspiration.quick_add_toast': '已将“{text}”加入灵感',
    'inspiration.daily_muse_toast': '每日灵感已更新！',
    'inspiration.remixing': 'Remix 中...',
    'inspiration.example_label': '例如：',
    'inspiration.remix_success_toast': '灵感库已 Remix 并更新！',
    'inspiration.reset_btn': '重置',
    'crys.title': '灵感结晶',
    'crys.subtitle': 'AI 已整理您的想法，请检视或调整。',
    'crys.btn_modify': '返回修改',
    'crys.btn_refine': '深度优化 (导演)',
    'crys.btn_check': '检查一致性',
    'crys.card_appearance': '外观',
    'crys.card_personality': '性格',
    'crys.card_backstory': '背景故事',
    'crys.card_speechStyle': '说话风格',
    'crys.card_behaviors': '行为模式',
    'crys.error.regeneration_failed': '重新生成失败',
    'crys.error.load_failed_title': '错误',
    'crys.error.load_failed_desc': '无法加载结构化人格。',
    'check.title': '一致性检查',
    'check.analyzing_desc': 'AI 正在深度阅读人设，寻找矛盾点与思维盲区...',
    'check.good': '整体一致性：良好',
    'check.issues': '检测到潜在问题',
    'check.btn_ignore': '忽略',
    'check.btn_fix': '自动修正',
    'check.btn_feature': '转为特色',
    'check.btn_sim': '进入模拟测试',
    'check.btn_remix': '深度 Remix',
    'check.remix_modal.title': '人格 Remix',
    'check.remix_modal.desc': 'AI 为您的角色注入了更深层的心理维度。请检视并接受这些变更，以强化您的角色。',
    'check.remix_modal.accept': '接受 Remix',
    'check.remix_modal.field_inner_voice': '内心戏',
    'check.remix_modal.field_core_wound': '核心创伤',
    'check.remix_modal.field_secret_desire': '隐藏渴望',
    'check.remix_modal.field_worldview': '世界观',
    'check.items_found': '找到 {count} 个问题项目',
    'check.issue_label': '问题：',
    'check.suggestion_label': 'AI 建议：',
    'check.error.action_failed': '操作失败，请重试。',
    'check.error.remix_failed': 'Remix 失败，请重试。',
    'sim.title': '模拟测试平台',
    'sim.chat': '对话模拟',
    'sim.quotes': '语录生成',
    'sim.placeholder': '说点什么...',
    'sim.regenerate': '重新生成',
    'sim.finalize': '完成并导出',
    'sim.turns_label': '回合数：',
    'sim.error_message': '[错误]',
    'final.title': '人格结晶',
    'final.subtitle': '准备部署',
    'final.export_options': '导出选项',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Text (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': '导演模式 • 模块 1-4',
    'director.sources': '资料来源',
    'director.error_offline': '导演离线了，请稍后再试。',
    'director.finish_btn': '完成并前往检查 (Check)',
    'director.skip_btn': 'AI 帮我补 (跳过)',
    'director.skip_text': '这题我没想法，请根据角色感觉帮我决定 (Skip & Auto-fill)',
    'director.system.ready_prompt': '系统就绪。请简短自我介绍，并只问第一个问题。',
    'director.system.compile_prompt': '访谈已完成。请严格依照 [输出格式]（角色定义、互动协议等）编译最终的系统提示。',
    'arch.title': '架构师模式',
    'arch.subtitle': '工程学派 • 结构化构建',
    'arch.step1': '核心身份',
    'arch.step2': '语言设定',
    'arch.step3': '态度情感',
    'arch.step4': '范例样本',
    'arch.step5': '最终蓝图',
    'arch.label_name': '名称 / 昵称',
    'arch.label_age': '年龄 (选填)',
    'arch.label_rel': '与用户的关系',
    'arch.label_tags': '性格关键词',
    'arch.label_desc': '性格综合描述',
    'arch.label_lang': '主要语言',
    'arch.label_prof': '熟练度 / 口音',
    'arch.label_tics': '口癖 / 第二语言',
    'arch.label_style': '主要语言风格',
    'arch.label_demeanor': '整体举止神态',
    'arch.label_towards': '对用户的态度',
    'arch.label_tone': '关键语气词',
    'arch.label_examples': '对话范例 (Few-Shot)',
    'arch.label_trigger': '最终AI指令',
    'arch.placeholder_tags': '#标签1 #标签2',
    'arch.placeholder_examples': '范例1: ...\n范例2: ...',
    'arch.btn_generate': '生成 Prompt',
    'arch.btn_refine': '接续导演模式',
    'tool.title': '工具核心',
    'tool.subtitle': '功能主义 • 协议设计',
    'tool.placeholder': '回应核心的提问...',
    'tool.compile': '[编译指令集]',
    'tool.compile_prompt': '资料收集完成，请立即输出最终的工具指令 JSON/Block。',
    'tool.btn_send': '执行',
    'tool.init_prompt': '我需要定义一个新的 AI 工具，请引导我完成整个流程。',
    'tool.sources': '资料来源',
    'antibias.title': '反偏见核心',
    'antibias.subtitle': '逻辑 • 拆解分析',
    'antibias.placeholder': '描述一个情境或文本以进行分析...',
    'antibias.compile': '[解构偏见]',
    'antibias.compile_prompt': '分析完成，请提供去偏见总结与建议。',
    'antibias.init_prompt': '我需要分析一段内容中的心理学偏见，请启动解构协议。',
    'antibias.sources': '资料来源',
    'antibias.btn_unsure': '不确定 / 模棱两可',
    'antibias.unsure_prompt': '我不确定，感觉有点模糊。请协助我分析可能的意图。'
  },
  es: {
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.finish': 'Finalizar',
    'common.loading': 'Cargando...',
    'common.copy': 'Copiar',
    'common.close': 'Cerrar',
    'common.auto_fill': 'Autocompletar IA',
    'common.ai_magic': 'Magia de IA...',
    'common.start_over': 'Empezar de nuevo',
    'common.copied': '¡Copiado al portapapeles!',
    'common.confirm_restart': '¿Estás seguro de que quieres empezar de nuevo? El progreso no guardado se perderá.',
    'common.create_new': 'Crear Nueva Persona',
    'common.compiling': 'Compilando...',
    'common.error.compilation_failed': 'La compilación falló. Por favor, inténtalo de nuevo.',
    'common.error.connection_refused': 'ERR_CONEXIÓN_RECHAZADA',
    'common.error.request_failed': 'ERR_PROCESANDO_SOLICITUD',
    'home.title': 'Alquimia de Persona',
    'home.subtitle': 'Invoca a tu personaje de IA único',
    'home.mode_vibe': 'Modo Vibe',
    'home.desc_vibe': 'Solo di lo que piensas. La IA lo organizará en un personaje.',
    'home.mode_arch': 'Arquitecto',
    'home.desc_arch': 'Construye un personaje con precisión llenando una hoja de especificaciones.',
    'home.mode_tool': 'Herramienta',
    'home.desc_tool': 'Crea un asistente de IA funcional para una tarea específica.',
    'home.mode_director': 'Modo Director',
    'home.desc_director': 'La IA te entrevista como un director para profundizar en tu personaje.',
    'home.mode_antibias': 'Anti-Sesgo',
    'home.desc_antibias': 'Analiza texto para descubrir puntos ciegos lógicos ocultos.',
    'home.workflow_title': 'Flujo de Trabajo Creativo',
    'home.workflow_desc': 'Comienza con una idea vaga. Deja que la IA converse contigo y explore conceptos para dar forma a un personaje vívido paso a paso.',
    'home.tools_title': 'Herramientas Independientes',
    'home.recommended': '(Recomendado)',
    'vibe.title': 'Modo Vibe',
    'vibe.subtitle': 'Paso 1: La Chispa',
    'vibe.placeholder': 'Escribe cualquier cosa... sentimientos, palabras clave, #etiquetas',
    'vibe.inspiration': '¿Necesitas inspiración?',
    'vibe.analyze_btn': 'Siguiente Paso',
    'vibe.intro_msg': 'Siéntete libre de compartir cualquier cosa... palabras clave, #etiquetas, música o sentimientos abstractos...',
    'vibe.modify_msg': 'Bienvenido de nuevo. ¿Qué te gustaría ajustar?',
    'vibe.sources': 'Fuentes',
    'vibe.compiling_desc': 'Estructurando tus ideas en una persona.',
    'inspiration.title': 'Buscar en mi mente...',
    'inspiration.search_placeholder': 'Buscar preguntas...',
    'inspiration.used_count': '✓ Usadas {count} preguntas',
    'inspiration.random_btn': 'Pregunta Aleatoria',
    'inspiration.expand_library': 'Expandir Biblioteca',
    'inspiration.expand_library_tooltip': 'La IA generará categorías completamente nuevas relacionadas con eventos actuales o tendencias y las agregará a la biblioteca existente.',
    'inspiration.optimize_library': 'Optimizar IA',
    'inspiration.optimize_library_short': 'Optimizar',
    'inspiration.optimize_library_tooltip': 'La IA revisará toda la biblioteca, eliminará preguntas obsoletas, actualizará ejemplos y agregará preguntas más profundas para mejorar la calidad general.',
    'inspiration.ai_is_thinking': 'La musa está pensando...',
    'inspiration.error.unavailable': 'Lo sentimos, la musa de IA no está disponible en este momento.',
    'inspiration.confirm_btn': 'Confirmar y Usar',
    'inspiration.cancel_btn': 'Cancelar',
    'inspiration.quick_add_toast': 'Se añadió "{text}" a la inspiración',
    'inspiration.daily_muse_toast': '¡La inspiración diaria ha sido actualizada!',
    'inspiration.remixing': 'Remixing...',
    'inspiration.example_label': 'Ejemplo:',
    'inspiration.remix_success_toast': '¡Biblioteca Remezclada y Actualizada!',
    'inspiration.reset_btn': 'Reiniciar',
    'crys.title': 'Cristalizar Vibe',
    'crys.subtitle': 'Revisa y refina la persona estructurada.',
    'crys.btn_modify': 'Modificar Vibe',
    'crys.btn_refine': 'Profundizar (Director)',
    'crys.btn_check': 'Revisar y Comprobar',
    'crys.card_appearance': 'Apariencia',
    'crys.card_personality': 'Personalidad',
    'crys.card_backstory': 'Trasfondo',
    'crys.card_speechStyle': 'Estilo de Habla',
    'crys.card_behaviors': 'Comportamientos',
    'crys.error.regeneration_failed': 'La regeneración falló',
    'crys.error.load_failed_title': 'Error',
    'crys.error.load_failed_desc': 'No se pudo cargar la persona estructurada.',
    'check.title': 'Comprobación de Coherencia',
    'check.analyzing_desc': 'La IA está leyendo la persona, buscando contradicciones y puntos ciegos...',
    'check.good': 'Coherencia: Buena',
    'check.issues': 'Problemas Detectados',
    'check.btn_ignore': 'Ignorar',
    'check.btn_fix': 'Arreglo Automático',
    'check.btn_feature': 'Hacer Característica',
    'check.btn_sim': 'Proceder a Simulación',
    'check.btn_remix': 'Remix Profundo',
    'check.remix_modal.title': 'Remix de Persona',
    'check.remix_modal.desc': 'La IA ha añadido capas psicológicas más profundas a tu personaje. Revisa y acepta estos cambios para mejorar tu persona.',
    'check.remix_modal.accept': 'Aceptar Remix',
    'check.remix_modal.field_inner_voice': 'Voz Interior',
    'check.remix_modal.field_core_wound': 'Herida Central',
    'check.remix_modal.field_secret_desire': 'Deseo Secreto',
    'check.remix_modal.field_worldview': 'Visión del Mundo',
    'check.items_found': '{count} problema(s) encontrado(s).',
    'check.issue_label': 'Problema:',
    'check.suggestion_label': 'Sugerencia de IA:',
    'check.error.action_failed': 'La acción falló. Por favor, inténtalo de nuevo.',
    'check.error.remix_failed': 'El Remix falló. Por favor, inténtalo de nuevo.',
    'sim.title': 'Plataforma de Simulación',
    'sim.chat': 'Chat',
    'sim.quotes': 'Citas',
    'sim.placeholder': 'Di algo...',
    'sim.regenerate': 'Regenerar',
    'sim.finalize': 'FINALIZAR Y EXPORTAR',
    'sim.turns_label': 'Turnos:',
    'sim.error_message': '[Error]',
    'final.title': 'Persona Cristalizada',
    'final.subtitle': 'Lista para desplegar.',
    'final.export_options': 'Opciones de Exportación',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Texto (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': 'Modo Director • Módulo 1-4',
    'director.sources': 'Fuentes',
    'director.error_offline': 'El director está desconectado. Por favor, inténtalo de nuevo.',
    'director.finish_btn': 'Finalizar y Comprobar',
    'director.skip_btn': 'Rellenar con IA (Saltar)',
    'director.skip_text': 'No tengo idea para esto, por favor decide por mí basándote en el vibe del personaje (Saltar y Autorellenar)',
    'director.system.ready_prompt': 'Sistema listo. Por favor, preséntate brevemente y haz SOLO la PRIMERA pregunta.',
    'director.system.compile_prompt': 'La entrevista ha finalizado. Por favor, compila el Prompt del Sistema Final ahora, siguiendo estrictamente el [Formato de Salida] (Definición de Rol, Protocolo de Interacción, etc.).',
    'arch.title': 'Arquitecto de Persona',
    'arch.subtitle': 'Escuela de Ingeniería • Estructurado',
    'arch.step1': 'Identidad',
    'arch.step2': 'Lenguaje',
    'arch.step3': 'Actitud',
    'arch.step4': 'Ejemplos',
    'arch.step5': 'Plano Final',
    'arch.label_name': 'Nombre / Apodo',
    'arch.label_age': 'Edad (Opcional)',
    'arch.label_rel': 'Relación con el Usuario',
    'arch.label_tags': 'Etiquetas de Personalidad Clave',
    'arch.label_desc': 'Descripción de Personalidad Integrada',
    'arch.label_lang': 'Idioma Principal',
    'arch.label_prof': 'Dominio / Acento',
    'arch.label_tics': 'Tics Verbales / Idioma Secundario',
    'arch.label_style': 'Estilo Central del Idioma Principal',
    'arch.label_demeanor': 'Comportamiento General',
    'arch.label_towards': 'Actitud Hacia el Usuario',
    'arch.label_tone': 'Palabras Clave de Tono',
    'arch.label_examples': 'Frases de Ejemplo',
    'arch.label_trigger': 'Instrucción Final (Disparador)',
    'arch.placeholder_tags': '#Etiqueta1 #Etiqueta2',
    'arch.placeholder_examples': 'Ejemplo 1: ...\nEjemplo 2: ...',
    'arch.btn_generate': 'Generar Prompt',
    'arch.btn_refine': 'Refinar con Director',
    'tool.title': 'Núcleo de Utilidad',
    'tool.subtitle': 'Funcionalismo • Diseño de Protocolo',
    'tool.placeholder': 'Responde a la consulta del núcleo...',
    'tool.compile': '[COMPILAR_CONJUNTO_DE_INSTRUCCIONES]',
    'tool.compile_prompt': 'Recopilación de datos completa. Emite ahora la directiva de utilidad final en JSON/Bloque.',
    'tool.btn_send': 'Ejecutar',
    'tool.init_prompt': 'Necesito definir una nueva herramienta de IA. Por favor, guíame en el proceso.',
    'tool.sources': 'Fuentes',
    'antibias.title': 'Núcleo Anti-Sesgo',
    'antibias.subtitle': 'Lógica • Deconstrucción',
    'antibias.placeholder': 'Describe un escenario o texto para analizar...',
    'antibias.compile': '[DECONSTRUIR_SESGO]',
    'antibias.compile_prompt': 'Análisis completo. Proporcione ahora el resumen y la recomendación sin sesgos.',
    'antibias.init_prompt': 'Necesito analizar algo en busca de sesgos psicológicos. Por favor, inicia el protocolo de deconstrucción.',
    'antibias.sources': 'Fuentes',
    'antibias.btn_unsure': 'No estoy seguro / Ambiguo',
    'antibias.unsure_prompt': 'No estoy seguro. Se siente ambiguo. Por favor, ayúdame a analizar las posibilidades.'
  },
  fr: {
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.finish': 'Terminer',
    'common.loading': 'Chargement...',
    'common.copy': 'Copier',
    'common.close': 'Fermer',
    'common.auto_fill': 'Remplissage auto IA',
    'common.ai_magic': 'Magie de l\'IA...',
    'common.start_over': 'Recommencer',
    'common.copied': 'Copié dans le presse-papiers !',
    'common.confirm_restart': 'Êtes-vous sûr de vouloir recommencer ? La progression non sauvegardée sera perdue.',
    'common.create_new': 'Créer une nouvelle Persona',
    'common.compiling': 'Compilation...',
    'common.error.compilation_failed': 'La compilation a échoué. Veuillez réessayer.',
    'common.error.connection_refused': 'ERR_CONNEXION_REFUSÉE',
    'common.error.request_failed': 'ERR_TRAITEMENT_REQUÊTE',
    'home.title': 'Alchimie de Persona',
    'home.subtitle': 'Invoquez votre personnage IA unique',
    'home.mode_vibe': 'Mode Vibe',
    'home.desc_vibe': 'Dites simplement ce que vous avez en tête. L\'IA l\'organisera en un personnage.',
    'home.mode_arch': 'Architecte',
    'home.desc_arch': 'Construisez un personnage avec précision en remplissant une fiche de spécifications.',
    'home.mode_tool': 'Outil',
    'home.desc_tool': 'Créez un assistant IA fonctionnel pour une tâche spécifique.',
    'home.mode_director': 'Mode Réalisateur',
    'home.desc_director': 'L\'IA vous interviewe comme un réalisateur pour approfondir votre personnage.',
    'home.mode_antibias': 'Anti-Biais',
    'home.desc_antibias': 'Analysez un texte pour découvrir des angles morts logiques cachés.',
    'home.workflow_title': 'Flux de Travail Créatif',
    'home.workflow_desc': 'Commencez avec une idée vague. Laissez l\'IA discuter avec vous et explorer des concepts pour façonner un personnage vivant étape par étape.',
    'home.tools_title': 'Outils Autonomes',
    'home.recommended': '(Recommandé)',
    'vibe.title': 'Mode Vibe',
    'vibe.subtitle': 'Étape 1 : L\'Étincelle',
    'vibe.placeholder': 'Écrivez n\'importe quoi... sentiments, mots-clés, #tags',
    'vibe.inspiration': 'Besoin d\'inspiration ?',
    'vibe.analyze_btn': 'Étape Suivante',
    'vibe.intro_msg': 'N\'hésitez pas à partager n\'importe quoi... mots-clés, #tags, musique ou sentiments abstraits...',
    'vibe.modify_msg': 'Content de vous revoir. Que souhaitez-vous ajuster ?',
    'vibe.sources': 'Sources',
    'vibe.compiling_desc': 'Structuration de vos idées en une persona.',
    'inspiration.title': 'Explorer mon esprit...',
    'inspiration.search_placeholder': 'Rechercher des questions...',
    'inspiration.used_count': '✓ {count} questions utilisées',
    'inspiration.random_btn': 'Question Aléatoire',
    'inspiration.expand_library': 'Étendre la Bibliothèque',
    'inspiration.expand_library_tooltip': 'L\'IA générera de toutes nouvelles catégories liées aux événements actuels ou aux tendances et les ajoutera à la bibliothèque existante.',
    'inspiration.optimize_library': 'Optimisation IA',
    'inspiration.optimize_library_short': 'Optimiser',
    'inspiration.optimize_library_tooltip': 'L\'IA examinera l\'ensemble de la bibliothèque, supprimera les questions obsolètes, mettra à jour les exemples et ajoutera des questions plus profondes pour améliorer la qualité globale.',
    'inspiration.ai_is_thinking': 'La muse réfléchit...',
    'inspiration.error.unavailable': 'Désolé, la muse IA est indisponible pour le moment.',
    'inspiration.confirm_btn': 'Confirmer et Utiliser',
    'inspiration.cancel_btn': 'Annuler',
    'inspiration.quick_add_toast': '"{text}" ajouté à l\'inspiration',
    'inspiration.daily_muse_toast': 'L\'inspiration quotidienne a été mise à jour !',
    'inspiration.remixing': 'Remixage...',
    'inspiration.example_label': 'Exemple :',
    'inspiration.remix_success_toast': 'Bibliothèque Remixée et Mise à Jour !',
    'inspiration.reset_btn': 'Réinitialiser',
    'crys.title': 'Cristalliser le Vibe',
    'crys.subtitle': 'Révisez et affinez la persona structurée.',
    'crys.btn_modify': 'Modifier le Vibe',
    'crys.btn_refine': 'Approfondir (Réalisateur)',
    'crys.btn_check': 'Vérifier la Cohérence',
    'crys.card_appearance': 'Apparence',
    'crys.card_personality': 'Personnalité',
    'crys.card_backstory': 'Histoire',
    'crys.card_speechStyle': 'Style de parole',
    'crys.card_behaviors': 'Comportements',
    'crys.error.regeneration_failed': 'La régénération a échoué',
    'crys.error.load_failed_title': 'Erreur',
    'crys.error.load_failed_desc': 'Impossible de charger la persona structurée.',
    'check.title': 'Vérification de Cohérence',
    'check.analyzing_desc': 'L\'IA analyse la persona, à la recherche de contradictions et d\'angles morts...',
    'check.good': 'Cohérence : Bonne',
    'check.issues': 'Problèmes Détectés',
    'check.btn_ignore': 'Ignorer',
    'check.btn_fix': 'Correction Auto',
    'check.btn_feature': 'Transformer en Caractéristique',
    'check.btn_sim': 'Passer à la Simulation',
    'check.btn_remix': 'Remix Profond',
    'check.remix_modal.title': 'Remix de Persona',
    'check.remix_modal.desc': 'L\'IA a ajouté des couches psychologiques plus profondes à votre personnage. Révisez et acceptez ces changements pour améliorer votre persona.',
    'check.remix_modal.accept': 'Accepter le Remix',
    'check.remix_modal.field_inner_voice': 'Voix Intérieure',
    'check.remix_modal.field_core_wound': 'Blessure Fondamentale',
    'check.remix_modal.field_secret_desire': 'Désir Secret',
    'check.remix_modal.field_worldview': 'Vision du Monde',
    'check.items_found': '{count} problème(s) trouvé(s).',
    'check.issue_label': 'Problème :',
    'check.suggestion_label': 'Suggestion de l\'IA :',
    'check.error.action_failed': 'L\'action a échoué. Veuillez réessayer.',
    'check.error.remix_failed': 'Le Remix a échoué. Veuillez réessayer.',
    'sim.title': 'Plateforme de Simulation',
    'sim.chat': 'Chat',
    'sim.quotes': 'Citations',
    'sim.placeholder': 'Dites quelque chose...',
    'sim.regenerate': 'Régénérer',
    'sim.finalize': 'FINALISER ET EXPORTER',
    'sim.turns_label': 'Tours :',
    'sim.error_message': '[Erreur]',
    'final.title': 'Persona Cristallisée',
    'final.subtitle': 'Prête pour le déploiement.',
    'final.export_options': 'Options d\'exportation',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Texte (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': 'Mode Réalisateur • Module 1-4',
    'director.sources': 'Sources',
    'director.error_offline': 'Le réalisateur est hors ligne. Veuillez réessayer.',
    'director.finish_btn': 'Terminer et Vérifier',
    'director.skip_btn': 'Remplir par IA (Passer)',
    'director.skip_text': 'Je n\'ai pas d\'idée pour celle-ci, veuillez décider pour moi en fonction de l\'ambiance du personnage (Passer et Remplir auto)',
    'director.system.ready_prompt': 'Système prêt. Veuillez vous présenter brièvement et poser UNIQUEMENT la PREMIÈRE question.',
    'director.system.compile_prompt': 'L\'interview est terminée. Veuillez compiler le Prompt Système Final maintenant, en suivant strictement le [Format de Sortie] (Définition du Rôle, Protocole d\'Interaction, etc.).',
    'arch.title': 'Architecte de Persona',
    'arch.subtitle': 'École d\'Ingénierie • Structuré',
    'arch.step1': 'Identité',
    'arch.step2': 'Langage',
    'arch.step3': 'Attitude',
    'arch.step4': 'Exemples',
    'arch.step5': 'Plan Final',
    'arch.label_name': 'Nom / Surnom',
    'arch.label_age': 'Âge (Optionnel)',
    'arch.label_rel': 'Relation avec l\'Utilisateur',
    'arch.label_tags': 'Tags de Personnalité Clés',
    'arch.label_desc': 'Description de Personnalité Intégrée',
    'arch.label_lang': 'Langue Principale',
    'arch.label_prof': 'Maîtrise / Accent',
    'arch.label_tics': 'Tics Verbaux / Langue Secondaire',
    'arch.label_style': 'Style Principal de la Langue',
    'arch.label_demeanor': 'Comportement Général',
    'arch.label_towards': 'Attitude Envers l\'Utilisateur',
    'arch.label_tone': 'Mots Clés de Tonalité',
    'arch.label_examples': 'Exemples de Phrases',
    'arch.label_trigger': 'Instruction Finale (Déclencheur)',
    'arch.placeholder_tags': '#Tag1 #Tag2',
    'arch.placeholder_examples': 'Exemple 1 : ...\nExemple 2 : ...',
    'arch.btn_generate': 'Générer le Prompt',
    'arch.btn_refine': 'Affiner avec le Réalisateur',
    'tool.title': 'Noyau Utilitaire',
    'tool.subtitle': 'Fonctionnalisme • Conception de Protocole',
    'tool.placeholder': 'Répondez à la requête du noyau...',
    'tool.compile': '[COMPILER_L\'ENSEMBLE_D\'INSTRUCTIONS]',
    'tool.compile_prompt': 'Collecte de données terminée. Produire maintenant la directive utilitaire finale JSON/Block.',
    'tool.btn_send': 'Exécuter',
    'tool.init_prompt': 'Je dois définir un nouvel outil IA. Veuillez me guider à travers le processus.',
    'tool.sources': 'Sources',
    'antibias.title': 'Noyau Anti-Biais',
    'antibias.subtitle': 'Logique • Déconstruction',
    'antibias.placeholder': 'Décrivez un scénario ou un texte à analyser...',
    'antibias.compile': '[DECONSTRUIR_LE_BIAIS]',
    'antibias.compile_prompt': 'Analyse terminée. Veuillez fournir le résumé et la recommandation sans biais maintenant.',
    'antibias.init_prompt': 'Je dois analyser quelque chose pour des biais psychologiques. Veuillez lancer le protocole de déconstruction.',
    'antibias.sources': 'Sources',
    'antibias.btn_unsure': 'Pas sûr / Ambigu',
    'antibias.unsure_prompt': 'Je ne suis pas sûr. Cela semble ambigu. Aidez-moi s\'il vous plaît à analyser les possibilités.'
  },
  ja: {
    'common.back': '戻る',
    'common.next': '次へ',
    'common.finish': '完了',
    'common.loading': '読み込み中...',
    'common.copy': 'コピー',
    'common.close': '閉じる',
    'common.auto_fill': 'AI自動入力',
    'common.ai_magic': 'AIの魔法...',
    'common.start_over': '最初から',
    'common.copied': 'コピーしました！',
    'common.confirm_restart': '最初からやり直しますか？保存されていない進行状況は失われます。',
    'common.create_new': '新規作成',
    'common.compiling': 'コンパイル中...',
    'common.error.compilation_failed': 'コンパイルに失敗しました。再試行してください。',
    'common.error.connection_refused': 'エラー：接続拒否',
    'common.error.request_failed': 'エラー：リクエスト処理失敗',
    'home.title': 'ペルソナ錬成',
    'home.subtitle': 'あなただけのAIキャラクターを召喚',
    'home.mode_vibe': 'バイブモード',
    'home.desc_vibe': '思いついたことを話すだけ。AIがキャラクターとして整理します。',
    'home.mode_arch': '設計士モード',
    'home.desc_arch': '仕様書を埋めるように、精密にキャラクターを構築します。',
    'home.mode_tool': 'ツールモード',
    'home.desc_tool': '特定のタスクを実行する機能的なAIアシスタントを作成します。',
    'home.mode_director': '監督モード',
    'home.desc_director': 'AIが監督のようにインタビューし、キャラクターを深掘りします。',
    'home.mode_antibias': 'アンチバイアス',
    'home.desc_antibias': 'テキストを分析し、隠れた論理的な死角を発見します。',
    'home.workflow_title': 'クリエイティブ・ワークフロー',
    'home.workflow_desc': '漠然としたアイデアから始めましょう。AIとの対話を通じて、生き生きとしたキャラクターを段階的に形作ります。',
    'home.tools_title': 'スタンドアロン・ツール',
    'home.recommended': '(推奨)',
    'vibe.title': 'バイブモード',
    'vibe.subtitle': 'ステップ1：閃き',
    'vibe.placeholder': '何でも書いてください... 感情、キーワード、#タグ',
    'vibe.inspiration': 'インスピレーションが必要？',
    'vibe.analyze_btn': '次のステップ',
    'vibe.intro_msg': 'キーワード、#タグ、音楽、抽象的な感情など、何でも共有してください...',
    'vibe.modify_msg': 'お帰りなさい。何を調整しますか？',
    'vibe.sources': '情報源',
    'vibe.compiling_desc': 'あなたのアイデアをペルソナとして構造化しています...',
    'inspiration.title': '思考を探索...',
    'inspiration.search_placeholder': '質問を検索...',
    'inspiration.used_count': '✓ {count} 問使用済み',
    'inspiration.random_btn': 'ランダムな質問',
    'inspiration.expand_library': 'ライブラリ拡張',
    'inspiration.expand_library_tooltip': 'AIが現在のイベントやトレンドに関連する新しいカテゴリを生成し、既存のライブラリに追加します。',
    'inspiration.optimize_library': 'AI最適化',
    'inspiration.optimize_library_short': '最適化',
    'inspiration.optimize_library_tooltip': 'AIがライブラリ全体を見直し、古い質問を削除し、例を更新し、より深い質問を追加して品質を向上させます。',
    'inspiration.ai_is_thinking': 'ミューズが思考中...',
    'inspiration.error.unavailable': '申し訳ありませんが、現在AIミューズは利用できません。',
    'inspiration.confirm_btn': '確認して使用',
    'inspiration.cancel_btn': 'キャンセル',
    'inspiration.quick_add_toast': '「{text}」をインスピレーションに追加しました',
    'inspiration.daily_muse_toast': '毎日のインスピレーションが更新されました！',
    'inspiration.remixing': 'リミックス中...',
    'inspiration.example_label': '例：',
    'inspiration.remix_success_toast': 'ライブラリがリミックスされ更新されました！',
    'inspiration.reset_btn': 'リセット',
    'crys.title': '結晶化',
    'crys.subtitle': '構造化されたペルソナを確認し、洗練させます。',
    'crys.btn_modify': 'バイブを修正',
    'crys.btn_refine': '深掘り (監督)',
    'crys.btn_check': '一貫性チェック',
    'crys.card_appearance': '外見',
    'crys.card_personality': '性格',
    'crys.card_backstory': '背景',
    'crys.card_speechStyle': '話し方',
    'crys.card_behaviors': '行動パターン',
    'crys.error.regeneration_failed': '再生成に失敗しました',
    'crys.error.load_failed_title': 'エラー',
    'crys.error.load_failed_desc': '構造化されたペルソナを読み込めませんでした。',
    'check.title': '一貫性チェック',
    'check.analyzing_desc': 'AIがペルソナを読み込み、矛盾や死角を探しています...',
    'check.good': '一貫性：良好',
    'check.issues': '問題を検出',
    'check.btn_ignore': '無視',
    'check.btn_fix': '自動修正',
    'check.btn_feature': '特徴にする',
    'check.btn_sim': 'シミュレーションへ',
    'check.btn_remix': 'ディープ・リミックス',
    'check.remix_modal.title': 'ペルソナ・リミックス',
    'check.remix_modal.desc': 'AIがキャラクターに深い心理的レイヤーを追加しました。これらの変更を確認して受け入れ、ペルソナを強化してください。',
    'check.remix_modal.accept': 'リミックスを受け入れる',
    'check.remix_modal.field_inner_voice': '内なる声',
    'check.remix_modal.field_core_wound': '核心的なトラウマ',
    'check.remix_modal.field_secret_desire': '密かな欲望',
    'check.remix_modal.field_worldview': '世界観',
    'check.items_found': '{count} 個の項目が見つかりました。',
    'check.issue_label': '問題：',
    'check.suggestion_label': 'AIの提案：',
    'check.error.action_failed': '操作に失敗しました。再試行してください。',
    'check.error.remix_failed': 'リミックスに失敗しました。再試行してください。',
    'sim.title': 'シミュレーションデッキ',
    'sim.chat': 'チャット',
    'sim.quotes': 'セリフ集',
    'sim.placeholder': '何か話しかけてください...',
    'sim.regenerate': '再生成',
    'sim.finalize': '完了してエクスポート',
    'sim.turns_label': 'ターン数：',
    'sim.error_message': '[エラー]',
    'final.title': 'ペルソナ結晶化完了',
    'final.subtitle': 'デプロイ準備完了。',
    'final.export_options': 'エクスポートオプション',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'テキスト (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': '監督モード • モジュール 1-4',
    'director.sources': '情報源',
    'director.error_offline': '監督はオフラインです。再試行してください。',
    'director.finish_btn': '完了してチェック',
    'director.skip_btn': 'AIにお任せ (スキップ)',
    'director.skip_text': '思いつかないので、キャラクターの雰囲気に合わせて決めてください (スキップ＆自動入力)',
    'director.system.ready_prompt': 'システム準備完了。簡単に自己紹介し、最初の質問だけをしてください。',
    'director.system.compile_prompt': 'インタビュー完了。[出力形式]（役割定義、対話プロトコルなど）に従って、最終的なシステムプロンプトをコンパイルしてください。',
    'arch.title': 'ペルソナ設計士',
    'arch.subtitle': '工学派 • 構造化構築',
    'arch.step1': 'アイデンティティ',
    'arch.step2': '言語',
    'arch.step3': '態度',
    'arch.step4': 'サンプル',
    'arch.step5': '青写真',
    'arch.label_name': '名前 / ニックネーム',
    'arch.label_age': '年齢 (任意)',
    'arch.label_rel': 'ユーザーとの関係',
    'arch.label_tags': '性格タグ',
    'arch.label_desc': '性格の統合的記述',
    'arch.label_lang': '主言語',
    'arch.label_prof': '熟練度 / アクセント',
    'arch.label_tics': '口癖 / 第二言語',
    'arch.label_style': '主言語のスタイル',
    'arch.label_demeanor': '全体的な振る舞い',
    'arch.label_towards': 'ユーザーへの態度',
    'arch.label_tone': 'トーンのキーワード',
    'arch.label_examples': '会話例',
    'arch.label_trigger': '最終指示 (トリガー)',
    'arch.placeholder_tags': '#タグ1 #タグ2',
    'arch.placeholder_examples': '例1: ...\n例2: ...',
    'arch.btn_generate': 'プロンプト生成',
    'arch.btn_refine': '監督モードで洗練',
    'tool.title': 'ユーティリティ・コア',
    'tool.subtitle': '機能主義 • プロトコル設計',
    'tool.placeholder': 'コアの問い合わせに応答...',
    'tool.compile': '[命令セットをコンパイル]',
    'tool.compile_prompt': 'データ収集完了。最終的なユーティリティ指令JSON/ブロックを出力してください。',
    'tool.btn_send': '実行',
    'tool.init_prompt': '新しいAIツールを定義する必要があります。プロセスを案内してください。',
    'tool.sources': '情報源',
    'antibias.title': 'アンチバイアス・コア',
    'antibias.subtitle': '論理 • 解体分析',
    'antibias.placeholder': '分析するシナリオやテキストを記述...',
    'antibias.compile': '[バイアスを解体]',
    'antibias.compile_prompt': '分析完了。バイアスのない要約と推奨事項を提供してください。',
    'antibias.init_prompt': '心理的バイアスを分析する必要があります。解体プロトコルを開始してください。',
    'antibias.sources': '情報源',
    'antibias.btn_unsure': '不明 / 曖昧',
    'antibias.unsure_prompt': 'よくわかりません。曖昧な感じがします。可能性を分析するのを手伝ってください。'
  },
  ko: {
    'common.back': '뒤로',
    'common.next': '다음',
    'common.finish': '완료',
    'common.loading': '로딩 중...',
    'common.copy': '복사',
    'common.close': '닫기',
    'common.auto_fill': 'AI 자동 완성',
    'common.ai_magic': 'AI 매직...',
    'common.start_over': '처음부터',
    'common.copied': '클립보드에 복사되었습니다!',
    'common.confirm_restart': '정말 다시 시작하시겠습니까? 저장되지 않은 진행 상황은 손실됩니다.',
    'common.create_new': '새 페르소나 만들기',
    'common.compiling': '컴파일 중...',
    'common.error.compilation_failed': '컴파일 실패. 다시 시도해주세요.',
    'common.error.connection_refused': '오류: 연결 거부됨',
    'common.error.request_failed': '오류: 요청 처리 실패',
    'home.title': '페르소나 연성',
    'home.subtitle': '당신만의 고유한 AI 캐릭터 소환',
    'home.mode_vibe': '바이브 모드',
    'home.desc_vibe': '생각나는 대로 말해보세요. AI가 캐릭터로 정리해드립니다.',
    'home.mode_arch': '설계사 모드',
    'home.desc_arch': '사양서를 채우듯 정밀하게 캐릭터를 구축합니다.',
    'home.mode_tool': '도구 모드',
    'home.desc_tool': '특정 작업을 수행하는 기능적인 AI 어시스턴트를 만듭니다.',
    'home.mode_director': '감독 모드',
    'home.desc_director': 'AI가 감독처럼 인터뷰하여 캐릭터의 깊이를 더합니다.',
    'home.mode_antibias': '안티 바이어스',
    'home.desc_antibias': '텍스트를 분석하여 숨겨진 논리적 사각지대를 찾아냅니다.',
    'home.workflow_title': '창작 워크플로우',
    'home.workflow_desc': '막연한 아이디어에서 시작하세요. AI와 대화하며 탐색하여 생생한 캐릭터를 단계별로 형성합니다.',
    'home.tools_title': '독립 기능 & 도구',
    'home.recommended': '(추천)',
    'vibe.title': '바이브 모드',
    'vibe.subtitle': '1단계: 불꽃',
    'vibe.placeholder': '아무거나 입력하세요... 감정, 키워드, #태그',
    'vibe.inspiration': '영감이 필요하세요?',
    'vibe.analyze_btn': '다음 단계',
    'vibe.intro_msg': '키워드, #태그, 음악, 추상적인 느낌 등 무엇이든 공유해주세요...',
    'vibe.modify_msg': '환영합니다. 무엇을 조정하시겠습니까?',
    'vibe.sources': '출처',
    'vibe.compiling_desc': '아이디어를 페르소나로 구조화하는 중...',
    'inspiration.title': '내 마음 탐색...',
    'inspiration.search_placeholder': '질문 검색...',
    'inspiration.used_count': '✓ {count}개 사용됨',
    'inspiration.random_btn': '무작위 질문',
    'inspiration.expand_library': '라이브러리 확장',
    'inspiration.expand_library_tooltip': 'AI가 최신 트렌드와 관련된 새로운 카테고리를 생성하여 라이브러리에 추가합니다.',
    'inspiration.optimize_library': 'AI 최적화',
    'inspiration.optimize_library_short': '최적화',
    'inspiration.optimize_library_tooltip': 'AI가 라이브러리 전체를 검토하여 오래된 질문을 제거하고, 예시를 업데이트하며, 더 깊이 있는 질문을 추가합니다.',
    'inspiration.ai_is_thinking': '뮤즈가 생각 중...',
    'inspiration.error.unavailable': '죄송합니다. 현재 AI 뮤즈를 사용할 수 없습니다.',
    'inspiration.confirm_btn': '확인 및 사용',
    'inspiration.cancel_btn': '취소',
    'inspiration.quick_add_toast': '"{text}" 영감에 추가됨',
    'inspiration.daily_muse_toast': '오늘의 영감이 업데이트되었습니다!',
    'inspiration.remixing': '리믹스 중...',
    'inspiration.example_label': '예시:',
    'inspiration.remix_success_toast': '라이브러리가 리믹스 및 업데이트되었습니다!',
    'inspiration.reset_btn': '초기화',
    'crys.title': '결정화',
    'crys.subtitle': '구조화된 페르소나를 검토하고 다듬습니다.',
    'crys.btn_modify': '바이브 수정',
    'crys.btn_refine': '심화 (감독)',
    'crys.btn_check': '일관성 확인',
    'crys.card_appearance': '외형',
    'crys.card_personality': '성격',
    'crys.card_backstory': '배경',
    'crys.card_speechStyle': '말투',
    'crys.card_behaviors': '행동 패턴',
    'crys.error.regeneration_failed': '재생성 실패',
    'crys.error.load_failed_title': '오류',
    'crys.error.load_failed_desc': '구조화된 페르소나를 불러올 수 없습니다.',
    'check.title': '일관성 확인',
    'check.analyzing_desc': 'AI가 페르소나를 읽으며 모순점과 사각지대를 찾고 있습니다...',
    'check.good': '일관성: 양호',
    'check.issues': '문제 감지됨',
    'check.btn_ignore': '무시',
    'check.btn_fix': '자동 수정',
    'check.btn_feature': '특징으로 전환',
    'check.btn_sim': '시뮬레이션으로 이동',
    'check.btn_remix': '딥 리믹스',
    'check.remix_modal.title': '페르소나 리믹스',
    'check.remix_modal.desc': 'AI가 캐릭터에 더 깊은 심리적 레이어를 추가했습니다. 변경 사항을 검토하고 수락하여 페르소나를 강화하세요.',
    'check.remix_modal.accept': '리믹스 수락',
    'check.remix_modal.field_inner_voice': '내면의 목소리',
    'check.remix_modal.field_core_wound': '핵심 트라우마',
    'check.remix_modal.field_secret_desire': '비밀스러운 욕망',
    'check.remix_modal.field_worldview': '세계관',
    'check.items_found': '{count}개의 항목이 발견되었습니다.',
    'check.issue_label': '문제:',
    'check.suggestion_label': 'AI 제안:',
    'check.error.action_failed': '작업 실패. 다시 시도해주세요.',
    'check.error.remix_failed': '리믹스 실패. 다시 시도해주세요.',
    'sim.title': '시뮬레이션 데크',
    'sim.chat': '채팅',
    'sim.quotes': '대사',
    'sim.placeholder': '말을 걸어보세요...',
    'sim.regenerate': '재생성',
    'sim.finalize': '완료 및 내보내기',
    'sim.turns_label': '턴:',
    'sim.error_message': '[오류]',
    'final.title': '페르소나 결정화 완료',
    'final.subtitle': '배포 준비 완료.',
    'final.export_options': '내보내기 옵션',
    'final.export_md': '마크다운 (.md)',
    'final.export_txt': '텍스트 (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': '감독 모드 • 모듈 1-4',
    'director.sources': '출처',
    'director.error_offline': '감독이 오프라인입니다. 다시 시도해주세요.',
    'director.finish_btn': '완료 및 확인',
    'director.skip_btn': 'AI 자동 채우기 (건너뛰기)',
    'director.skip_text': '아이디어가 없으니 캐릭터 분위기에 맞춰서 결정해주세요 (건너뛰기 & 자동 채우기)',
    'director.system.ready_prompt': '시스템 준비 완료. 간단히 자기소개 후 첫 번째 질문만 하세요.',
    'director.system.compile_prompt': '인터뷰 완료. [출력 형식](역할 정의, 상호작용 프로토콜 등)에 따라 최종 시스템 프롬프트를 컴파일하세요.',
    'arch.title': '페르소나 설계사',
    'arch.subtitle': '공학파 • 구조적 구축',
    'arch.step1': '정체성',
    'arch.step2': '언어',
    'arch.step3': '태도',
    'arch.step4': '예시',
    'arch.step5': '청사진',
    'arch.label_name': '이름 / 별명',
    'arch.label_age': '나이 (선택)',
    'arch.label_rel': '사용자와의 관계',
    'arch.label_tags': '핵심 성격 태그',
    'arch.label_desc': '통합 성격 설명',
    'arch.label_lang': '주 언어',
    'arch.label_prof': '숙련도 / 억양',
    'arch.label_tics': '말버릇 / 제2언어',
    'arch.label_style': '주 언어 스타일',
    'arch.label_demeanor': '전반적인 태도',
    'arch.label_towards': '사용자에 대한 태도',
    'arch.label_tone': '핵심 어조 키워드',
    'arch.label_examples': '대화 예시',
    'arch.label_trigger': '최종 지시 (트리거)',
    'arch.placeholder_tags': '#태그1 #태그2',
    'arch.placeholder_examples': '예시 1: ...\n예시 2: ...',
    'arch.btn_generate': '프롬프트 생성',
    'arch.btn_refine': '감독 모드로 다듬기',
    'tool.title': '유틸리티 코어',
    'tool.subtitle': '기능주의 • 프로토콜 설계',
    'tool.placeholder': '코어의 질문에 응답...',
    'tool.compile': '[명령어 세트 컴파일]',
    'tool.compile_prompt': '데이터 수집 완료. 최종 유틸리티 지시 JSON/Block을 출력하세요.',
    'tool.btn_send': '실행',
    'tool.init_prompt': '새로운 AI 도구를 정의해야 합니다. 프로세스를 안내해주세요.',
    'tool.sources': '출처',
    'antibias.title': '안티 바이어스 코어',
    'antibias.subtitle': '논리 • 해체 분석',
    'antibias.placeholder': '분석할 시나리오나 텍스트 설명...',
    'antibias.compile': '[편향 해체]',
    'antibias.compile_prompt': '분석 완료. 편향 없는 요약과 권장 사항을 제공하세요.',
    'antibias.init_prompt': '심리적 편향을 분석해야 합니다. 해체 프로토콜을 시작해주세요.',
    'antibias.sources': '출처',
    'antibias.btn_unsure': '잘 모름 / 모호함',
    'antibias.unsure_prompt': '잘 모르겠습니다. 애매한 것 같아요. 가능성을 분석하도록 도와주세요.'
  },
  de: {
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.finish': 'Fertig',
    'common.loading': 'Laden...',
    'common.copy': 'Kopieren',
    'common.close': 'Schließen',
    'common.auto_fill': 'AI Auto-Fill',
    'common.ai_magic': 'AI-Magie...',
    'common.start_over': 'Neustart',
    'common.copied': 'In Zwischenablage kopiert!',
    'common.confirm_restart': 'Möchten Sie wirklich neu starten? Ungespeicherte Fortschritte gehen verloren.',
    'common.create_new': 'Neue Persona erstellen',
    'common.compiling': 'Kompilieren...',
    'common.error.compilation_failed': 'Kompilierung fehlgeschlagen. Bitte erneut versuchen.',
    'common.error.connection_refused': 'FEHLER: Verbindung abgelehnt',
    'common.error.request_failed': 'FEHLER: Anfrage fehlgeschlagen',
    'home.title': 'Persona-Alchemie',
    'home.subtitle': 'Beschwören Sie Ihren einzigartigen AI-Charakter',
    'home.mode_vibe': 'Vibe-Modus',
    'home.desc_vibe': 'Sagen Sie einfach, was Ihnen durch den Kopf geht. Die KI organisiert es zu einem Charakter.',
    'home.mode_arch': 'Architekt',
    'home.desc_arch': 'Erstellen Sie einen Charakter präzise, indem Sie ein detailliertes Datenblatt ausfüllen.',
    'home.mode_tool': 'Werkzeug',
    'home.desc_tool': 'Erstellen Sie einen funktionalen KI-Assistenten für eine bestimmte Aufgabe.',
    'home.mode_director': 'Regisseur-Modus',
    'home.desc_director': 'Die KI interviewt Sie wie ein Regisseur, um Ihren Charakter zu vertiefen.',
    'home.mode_antibias': 'Anti-Bias',
    'home.desc_antibias': 'Analysieren Sie Text, um versteckte logische blinde Flecken aufzudecken.',
    'home.workflow_title': 'Kreativer Workflow',
    'home.workflow_desc': 'Beginnen Sie mit einer vagen Idee. Lassen Sie die KI mit Ihnen chatten und Konzepte erkunden, um Schritt für Schritt einen lebendigen Charakter zu formen.',
    'home.tools_title': 'Standalone-Tools',
    'home.recommended': '(Empfohlen)',
    'vibe.title': 'Vibe-Modus',
    'vibe.subtitle': 'Schritt 1: Der Funke',
    'vibe.placeholder': 'Schreiben Sie irgendetwas... Gefühle, Stichwörter, #Tags',
    'vibe.inspiration': 'Inspiration benötigt?',
    'vibe.analyze_btn': 'Nächster Schritt',
    'vibe.intro_msg': 'Teilen Sie alles mit... Stichwörter, #Tags, Musik oder abstrakte Gefühle...',
    'vibe.modify_msg': 'Willkommen zurück. Was möchten Sie anpassen?',
    'vibe.sources': 'Quellen',
    'vibe.compiling_desc': 'Ihre Ideen werden zu einer Persona strukturiert.',
    'inspiration.title': 'Gedanken durchsuchen...',
    'inspiration.search_placeholder': 'Fragen suchen...',
    'inspiration.used_count': '✓ {count} verwendet',
    'inspiration.random_btn': 'Zufällige Frage',
    'inspiration.expand_library': 'Bibliothek erweitern',
    'inspiration.expand_library_tooltip': 'Die KI generiert brandneue Kategorien zu aktuellen Ereignissen oder Trends und fügt sie der Bibliothek hinzu.',
    'inspiration.optimize_library': 'KI-Optimierung',
    'inspiration.optimize_library_short': 'Optimieren',
    'inspiration.optimize_library_tooltip': 'Die KI überprüft die gesamte Bibliothek, entfernt veraltete Fragen, aktualisiert Beispiele und fügt tiefere Fragen hinzu.',
    'inspiration.ai_is_thinking': 'Muse denkt nach...',
    'inspiration.error.unavailable': 'Sorry, die KI-Muse ist derzeit nicht verfügbar.',
    'inspiration.confirm_btn': 'Bestätigen & Verwenden',
    'inspiration.cancel_btn': 'Abbrechen',
    'inspiration.quick_add_toast': '"{text}" zur Inspiration hinzugefügt',
    'inspiration.daily_muse_toast': 'Tägliche Inspiration wurde aktualisiert!',
    'inspiration.remixing': 'Remixing...',
    'inspiration.example_label': 'Beispiel:',
    'inspiration.remix_success_toast': 'Bibliothek remixed & aktualisiert!',
    'inspiration.reset_btn': 'Zurücksetzen',
    'crys.title': 'Vibe kristallisieren',
    'crys.subtitle': 'Überprüfen und verfeinern Sie die strukturierte Persona.',
    'crys.btn_modify': 'Vibe ändern',
    'crys.btn_refine': 'Vertiefen (Regisseur)',
    'crys.btn_check': 'Konsistenzprüfung',
    'crys.card_appearance': 'Aussehen',
    'crys.card_personality': 'Persönlichkeit',
    'crys.card_backstory': 'Hintergrundgeschichte',
    'crys.card_speechStyle': 'Sprechstil',
    'crys.card_behaviors': 'Verhaltensweisen',
    'crys.error.regeneration_failed': 'Neugenerierung fehlgeschlagen',
    'crys.error.load_failed_title': 'Fehler',
    'crys.error.load_failed_desc': 'Strukturierte Persona konnte nicht geladen werden.',
    'check.title': 'Konsistenzprüfung',
    'check.analyzing_desc': 'Die KI liest die Persona und sucht nach Widersprüchen und blinden Flecken...',
    'check.good': 'Konsistenz: Gut',
    'check.issues': 'Probleme erkannt',
    'check.btn_ignore': 'Ignorieren',
    'check.btn_fix': 'Auto-Fix',
    'check.btn_feature': 'Zum Feature machen',
    'check.btn_sim': 'Zur Simulation',
    'check.btn_remix': 'Deep Remix',
    'check.remix_modal.title': 'Persona Remix',
    'check.remix_modal.desc': 'Die KI hat Ihrem Charakter tiefere psychologische Ebenen hinzugefügt. Überprüfen und akzeptieren Sie diese Änderungen.',
    'check.remix_modal.accept': 'Remix akzeptieren',
    'check.remix_modal.field_inner_voice': 'Innere Stimme',
    'check.remix_modal.field_core_wound': 'Kernwunde',
    'check.remix_modal.field_secret_desire': 'Geheimes Verlangen',
    'check.remix_modal.field_worldview': 'Weltanschauung',
    'check.items_found': '{count} Element(e) gefunden.',
    'check.issue_label': 'Problem:',
    'check.suggestion_label': 'KI-Vorschlag:',
    'check.error.action_failed': 'Aktion fehlgeschlagen. Bitte erneut versuchen.',
    'check.error.remix_failed': 'Remix fehlgeschlagen. Bitte erneut versuchen.',
    'sim.title': 'Simulationsdeck',
    'sim.chat': 'Chat',
    'sim.quotes': 'Zitate',
    'sim.placeholder': 'Sag etwas...',
    'sim.regenerate': 'Neu generieren',
    'sim.finalize': 'ABSCHLIESSEN & EXPORTIEREN',
    'sim.turns_label': 'Züge:',
    'sim.error_message': '[Fehler]',
    'final.title': 'Persona kristallisiert',
    'final.subtitle': 'Bereit für den Einsatz.',
    'final.export_options': 'Exportoptionen',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Text (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': 'Regisseur-Modus • Modul 1-4',
    'director.sources': 'Quellen',
    'director.error_offline': 'Regisseur ist offline. Bitte erneut versuchen.',
    'director.finish_btn': 'Fertigstellen & Prüfen',
    'director.skip_btn': 'KI-Fill (Überspringen)',
    'director.skip_text': 'Ich habe keine Idee, bitte entscheide basierend auf dem Vibe (Überspringen & Auto-Fill)',
    'director.system.ready_prompt': 'System bereit. Bitte stellen Sie sich kurz vor und stellen Sie NUR die ERSTE Frage.',
    'director.system.compile_prompt': 'Interview abgeschlossen. Bitte kompilieren Sie jetzt den finalen System-Prompt strikt nach [Ausgabeformat].',
    'arch.title': 'Persona-Architekt',
    'arch.subtitle': 'Ingenieurschule • Strukturiert',
    'arch.step1': 'Identität',
    'arch.step2': 'Sprache',
    'arch.step3': 'Einstellung',
    'arch.step4': 'Beispiele',
    'arch.step5': 'Blaupause',
    'arch.label_name': 'Name / Spitzname',
    'arch.label_age': 'Alter (Optional)',
    'arch.label_rel': 'Beziehung zum Benutzer',
    'arch.label_tags': 'Kern-Persönlichkeits-Tags',
    'arch.label_desc': 'Integrierte Beschreibung',
    'arch.label_lang': 'Primärsprache',
    'arch.label_prof': 'Kompetenz / Akzent',
    'arch.label_tics': 'Verbale Tics / Zweitsprache',
    'arch.label_style': 'Kernstil der Sprache',
    'arch.label_demeanor': 'Allgemeines Auftreten',
    'arch.label_towards': 'Einstellung zum Benutzer',
    'arch.label_tone': 'Schlüssel-Tonwörter',
    'arch.label_examples': 'Beispielsätze',
    'arch.label_trigger': 'Finale Anweisung (Trigger)',
    'arch.placeholder_tags': '#Tag1 #Tag2',
    'arch.placeholder_examples': 'Beispiel 1: ...\nBeispiel 2: ...',
    'arch.btn_generate': 'Prompt generieren',
    'arch.btn_refine': 'Mit Regisseur verfeinern',
    'tool.title': 'Utility-Core',
    'tool.subtitle': 'Funktionalismus • Protokoll-Design',
    'tool.placeholder': 'Auf Core-Anfrage antworten...',
    'tool.compile': '[BEFEHLSSATZ_KOMPILIEREN]',
    'tool.compile_prompt': 'Datenerfassung abgeschlossen. Geben Sie jetzt die finale Utility-Directive als JSON/Block aus.',
    'tool.btn_send': 'Ausführen',
    'tool.init_prompt': 'Ich muss ein neues KI-Tool definieren. Bitte führen Sie mich durch den Prozess.',
    'tool.sources': 'Quellen',
    'antibias.title': 'Anti-Bias-Core',
    'antibias.subtitle': 'Logik • Dekonstruktion',
    'antibias.placeholder': 'Beschreiben Sie ein Szenario oder einen Text zur Analyse...',
    'antibias.compile': '[BIAS_DEKONSTRUIEREN]',
    'antibias.compile_prompt': 'Analyse abgeschlossen. Bitte geben Sie jetzt die Zusammenfassung und Empfehlung ohne Bias.',
    'antibias.init_prompt': 'Ich muss etwas auf psychologische Biases analysieren. Bitte starten Sie das Dekonstruktionsprotokoll.',
    'antibias.sources': 'Quellen',
    'antibias.btn_unsure': 'Unsicher / Mehrdeutig',
    'antibias.unsure_prompt': 'Ich bin mir nicht sicher. Es fühlt sich mehrdeutig an. Bitte helfen Sie mir, die Möglichkeiten zu analysieren.'
  },
  pt: {
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.finish': 'Concluir',
    'common.loading': 'Carregando...',
    'common.copy': 'Copiar',
    'common.close': 'Fechar',
    'common.auto_fill': 'Preenchimento Automático IA',
    'common.ai_magic': 'Magia da IA...',
    'common.start_over': 'Recomeçar',
    'common.copied': 'Copiado para a área de transferência!',
    'common.confirm_restart': 'Tem certeza que deseja recomeçar? O progresso não salvo será perdido.',
    'common.create_new': 'Criar Nova Persona',
    'common.compiling': 'Compilando...',
    'common.error.compilation_failed': 'Falha na compilação. Tente novamente.',
    'common.error.connection_refused': 'ERRO: Conexão Recusada',
    'common.error.request_failed': 'ERRO: Falha no Processamento',
    'home.title': 'Alquimia de Persona',
    'home.subtitle': 'Invoque seu personagem de IA único',
    'home.mode_vibe': 'Modo Vibe',
    'home.desc_vibe': 'Diga o que está em sua mente. A IA organizará isso em um personagem.',
    'home.mode_arch': 'Arquiteto',
    'home.desc_arch': 'Construa um personagem com precisão preenchendo uma ficha técnica.',
    'home.mode_tool': 'Ferramenta',
    'home.desc_tool': 'Crie um assistente de IA funcional para uma tarefa específica.',
    'home.mode_director': 'Modo Diretor',
    'home.desc_director': 'A IA entrevista você como um diretor para aprofundar seu personagem.',
    'home.mode_antibias': 'Anti-Viés',
    'home.desc_antibias': 'Analise textos para descobrir pontos cegos lógicos ocultos.',
    'home.workflow_title': 'Fluxo Criativo',
    'home.workflow_desc': 'Comece com uma ideia vaga. Deixe a IA conversar com você e explorar conceitos para moldar um personagem vívido passo a passo.',
    'home.tools_title': 'Ferramentas Independentes',
    'home.recommended': '(Recomendado)',
    'vibe.title': 'Modo Vibe',
    'vibe.subtitle': 'Passo 1: A Centelha',
    'vibe.placeholder': 'Digite qualquer coisa... sentimentos, palavras-chave, #tags',
    'vibe.inspiration': 'Precisa de Inspiração?',
    'vibe.analyze_btn': 'Próximo Passo',
    'vibe.intro_msg': 'Sinta-se à vontade para compartilhar qualquer coisa... palavras-chave, #tags, música ou sentimentos abstratos...',
    'vibe.modify_msg': 'Bem-vindo de volta. O que você gostaria de ajustar?',
    'vibe.sources': 'Fontes',
    'vibe.compiling_desc': 'Estruturando suas ideias em uma persona.',
    'inspiration.title': 'Explorar minha mente...',
    'inspiration.search_placeholder': 'Buscar perguntas...',
    'inspiration.used_count': '✓ {count} usadas',
    'inspiration.random_btn': 'Pergunta Aleatória',
    'inspiration.expand_library': 'Expandir Biblioteca',
    'inspiration.expand_library_tooltip': 'A IA gerará categorias totalmente novas relacionadas a tendências e as adicionará à biblioteca.',
    'inspiration.optimize_library': 'Otimizar IA',
    'inspiration.optimize_library_short': 'Otimizar',
    'inspiration.optimize_library_tooltip': 'A IA revisará toda a biblioteca, removerá perguntas obsoletas e adicionará perguntas mais profundas.',
    'inspiration.ai_is_thinking': 'A musa está pensando...',
    'inspiration.error.unavailable': 'Desculpe, a musa de IA está indisponível no momento.',
    'inspiration.confirm_btn': 'Confirmar e Usar',
    'inspiration.cancel_btn': 'Cancelar',
    'inspiration.quick_add_toast': '"{text}" adicionado à inspiração',
    'inspiration.daily_muse_toast': 'Inspiração diária atualizada!',
    'inspiration.remixing': 'Remixando...',
    'inspiration.example_label': 'Exemplo:',
    'inspiration.remix_success_toast': 'Biblioteca Remixada e Atualizada!',
    'inspiration.reset_btn': 'Reiniciar',
    'crys.title': 'Cristalizar Vibe',
    'crys.subtitle': 'Revise e refine a persona estruturada.',
    'crys.btn_modify': 'Modificar Vibe',
    'crys.btn_refine': 'Aprofundar (Diretor)',
    'crys.btn_check': 'Verificar Consistência',
    'crys.card_appearance': 'Aparência',
    'crys.card_personality': 'Personalidade',
    'crys.card_backstory': 'História de Fundo',
    'crys.card_speechStyle': 'Estilo de Fala',
    'crys.card_behaviors': 'Comportamentos',
    'crys.error.regeneration_failed': 'Falha na regeneração',
    'crys.error.load_failed_title': 'Erro',
    'crys.error.load_failed_desc': 'Não foi possível carregar a persona estruturada.',
    'check.title': 'Verificação de Consistência',
    'check.analyzing_desc': 'A IA está lendo a persona, procurando contradições e pontos cegos...',
    'check.good': 'Consistência: Boa',
    'check.issues': 'Problemas Detectados',
    'check.btn_ignore': 'Ignorar',
    'check.btn_fix': 'Correção Auto',
    'check.btn_feature': 'Tornar Recurso',
    'check.btn_sim': 'Ir para Simulação',
    'check.btn_remix': 'Remix Profundo',
    'check.remix_modal.title': 'Remix de Persona',
    'check.remix_modal.desc': 'A IA adicionou camadas psicológicas mais profundas ao seu personagem. Revise e aceite essas mudanças.',
    'check.remix_modal.accept': 'Aceitar Remix',
    'check.remix_modal.field_inner_voice': 'Voz Interior',
    'check.remix_modal.field_core_wound': 'Ferida Central',
    'check.remix_modal.field_secret_desire': 'Desejo Secreto',
    'check.remix_modal.field_worldview': 'Visão de Mundo',
    'check.items_found': '{count} item(ns) encontrado(s).',
    'check.issue_label': 'Problema:',
    'check.suggestion_label': 'Sugestão da IA:',
    'check.error.action_failed': 'Ação falhou. Tente novamente.',
    'check.error.remix_failed': 'Remix falhou. Tente novamente.',
    'sim.title': 'Deck de Simulação',
    'sim.chat': 'Chat',
    'sim.quotes': 'Citações',
    'sim.placeholder': 'Diga algo...',
    'sim.regenerate': 'Regenerar',
    'sim.finalize': 'FINALIZAR E EXPORTAR',
    'sim.turns_label': 'Turnos:',
    'sim.error_message': '[Erro]',
    'final.title': 'Persona Cristalizada',
    'final.subtitle': 'Pronta para implantação.',
    'final.export_options': 'Opções de Exportação',
    'final.export_md': 'Markdown (.md)',
    'final.export_txt': 'Texto (.txt)',
    'final.export_json': 'JSON (.json)',
    'director.subtitle': 'Modo Diretor • Módulo 1-4',
    'director.sources': 'Fontes',
    'director.error_offline': 'Diretor offline. Tente novamente.',
    'director.finish_btn': 'Finalizar e Verificar',
    'director.skip_btn': 'IA Preencher (Pular)',
    'director.skip_text': 'Não tenho ideia, decida por mim com base na vibe do personagem (Pular & Preenchimento Auto)',
    'director.system.ready_prompt': 'Sistema pronto. Apresente-se brevemente e faça APENAS a PRIMEIRA pergunta.',
    'director.system.compile_prompt': 'Entrevista concluída. Compile o Prompt de Sistema Final agora, seguindo estritamente o [Formato de Saída].',
    'arch.title': 'Arquiteto de Persona',
    'arch.subtitle': 'Escola de Engenharia • Estruturado',
    'arch.step1': 'Identidade',
    'arch.step2': 'Linguagem',
    'arch.step3': 'Atitude',
    'arch.step4': 'Exemplos',
    'arch.step5': 'Planta Final',
    'arch.label_name': 'Nome / Apelido',
    'arch.label_age': 'Idade (Opcional)',
    'arch.label_rel': 'Relação com Usuário',
    'arch.label_tags': 'Tags de Personalidade',
    'arch.label_desc': 'Descrição Integrada',
    'arch.label_lang': 'Idioma Principal',
    'arch.label_prof': 'Proficiência / Sotaque',
    'arch.label_tics': 'Tiques Verbais / 2º Idioma',
    'arch.label_style': 'Estilo Central',
    'arch.label_demeanor': 'Comportamento Geral',
    'arch.label_towards': 'Atitude com Usuário',
    'arch.label_tone': 'Palavras-chave de Tom',
    'arch.label_examples': 'Frases de Exemplo',
    'arch.label_trigger': 'Instrução Final (Gatilho)',
    'arch.placeholder_tags': '#Tag1 #Tag2',
    'arch.placeholder_examples': 'Exemplo 1: ...\nExemplo 2: ...',
    'arch.btn_generate': 'Gerar Prompt',
    'arch.btn_refine': 'Refinar com Diretor',
    'tool.title': 'Núcleo Utilitário',
    'tool.subtitle': 'Funcionalismo • Design de Protocolo',
    'tool.placeholder': 'Responda à consulta do núcleo...',
    'tool.compile': '[COMPILAR_CONJUNTO_DE_INSTRUÇÕES]',
    'tool.compile_prompt': 'Coleta de dados concluída. Gere a diretiva utilitária final em JSON/Bloco agora.',
    'tool.btn_send': 'Executar',
    'tool.init_prompt': 'Preciso definir uma nova ferramenta de IA. Por favor, guie-me pelo processo.',
    'tool.sources': 'Fontes',
    'antibias.title': 'Núcleo Anti-Viés',
    'antibias.subtitle': 'Lógica • Desconstrução',
    'antibias.placeholder': 'Descreva um cenário ou texto para analisar...',
    'antibias.compile': '[DESCONSTRUIR_VIÉS]',
    'antibias.compile_prompt': 'Análise completa. Forneça agora o resumo e a recomendação sem viés.',
    'antibias.init_prompt': 'Preciso analisar algo em busca de vieses psicológicos. Inicie o protocolo de desconstrução.',
    'antibias.sources': 'Fontes',
    'antibias.btn_unsure': 'Não tenho certeza / Ambíguo',
    'antibias.unsure_prompt': 'Não tenho certeza. Parece ambíguo. Por favor, ajude-me a analisar as possibilidades.'
  }
};

const INSPIRATION_STORAGE_KEY = 'persona_inspiration_data';
const INSPIRATION_TIMESTAMP_KEY = 'persona_inspiration_last_fetch';
const SESSION_STORAGE_KEY = 'persona_session_state'; // Key for auto-save

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private gemini = inject(GeminiService);

  private historyStack = signal<PersonaState[]>([]);
  private currentStateIndex = signal<number>(-1);

  // Inspiration Data - GLOBAL STATE
  inspirationCategories = signal<InspirationCategory[]>(INITIAL_INSPIRATION_DATA);

  // I18n & Theming State
  currentLang = signal<Language>('zh-TW');
  theme = signal<Theme>('light');
  newInspirationToast = signal<string>('');
  
  // Translation Helper
  t(key: keyof typeof TRANSLATIONS['en'], params?: Record<string, string | number>): string {
    const lang = this.currentLang();
    let translation = TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      }
    }
    
    return translation;
  }

  // Derived signal
  currentStep = computed(() => this.state().step);
  
  // Active state accessor
  state = computed(() => {
    const idx = this.currentStateIndex();
    const stack = this.historyStack();
    if (idx >= 0 && idx < stack.length) {
      return stack[idx];
    }
    return this.getEmptyState();
  });

  constructor() {
    this.loadState(); // Try to load from localStorage first
    
    // STARTUP LOGIC:
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // 1. Theme Check
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme && ['light', 'slate', 'dark', 'black', 'amoled'].includes(storedTheme)) {
            this.theme.set(storedTheme);
        } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.theme.set(prefersDark ? 'dark' : 'light');
        }

        // 2. Load Persisted Inspiration Library
        const storedInspiration = localStorage.getItem(INSPIRATION_STORAGE_KEY);
        if (storedInspiration) {
            try {
                const parsed = JSON.parse(storedInspiration);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.inspirationCategories.set(parsed);
                }
            } catch (e) {
                console.error("Failed to load persisted inspiration data, reverting to default.");
            }
        }
        
        // 3. Daily Muse: Auto-fetch new inspiration if stale
        this.initDailyInspiration();
    }

    // Effect: Auto-save session state and inspiration library when they change
    effect(() => {
       const stack = this.historyStack();
       const index = this.currentStateIndex();
       const inspiration = this.inspirationCategories();

       if (typeof window !== 'undefined' && window.localStorage) {
           if (stack.length > 1 || stack[0]?.vibeMessages.length > 0) { // Only save if there's progress
             localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ history: stack, index }));
           }
           localStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(inspiration));
       }
    });
  }
  
  private loadState() {
    if (typeof window !== 'undefined' && window.localStorage) {
        const savedState = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedState) {
            try {
                const { history, index } = JSON.parse(savedState);
                if (Array.isArray(history) && history.length > 0 && typeof index === 'number') {
                    this.historyStack.set(history);
                    this.currentStateIndex.set(index);
                    console.log('Session restored from localStorage.');
                    return;
                }
            } catch (e) {
                console.error('Failed to parse saved state, starting fresh.', e);
                localStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }
    }
    // If no saved state, reset to empty
    this.reset(false); // don't clear storage on initial load
  }

  initDailyInspiration() {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

      const lastFetchStr = localStorage.getItem(INSPIRATION_TIMESTAMP_KEY);
      const now = Date.now();
      const cooldown = 1000 * 60 * 60 * 12; // 12 Hours cooldown

      if (!lastFetchStr || (now - parseInt(lastFetchStr) > cooldown)) {
          // Trigger background fetch (fire and forget)
          console.log('Daily Muse: Fetching new inspiration...');
          this.addAIInspirationCategories().then(() => {
              localStorage.setItem(INSPIRATION_TIMESTAMP_KEY, now.toString());
              this.newInspirationToast.set(this.t('inspiration.daily_muse_toast'));
              console.log('Daily Muse: Inspiration updated.');
          }).catch(err => console.warn('Daily Muse: Failed to fetch.', err));
      }
  }

  cycleLang() {
    const langs: Language[] = ['en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'de', 'es', 'fr', 'pt'];
    this.currentLang.update(current => {
        const currentIndex = langs.indexOf(current);
        const nextIndex = (currentIndex + 1) % langs.length;
        return langs[nextIndex];
    });
  }

  cycleTheme() {
    const themes: Theme[] = ['light', 'slate', 'dark', 'black', 'amoled'];
    this.theme.update(current => {
        const currentIndex = themes.indexOf(current);
        const nextIndex = (currentIndex + 1) % themes.length;
        return themes[nextIndex];
    });
  }

  themeIcon = computed(() => {
    switch(this.theme()) {
        case 'light': return 'light_mode';
        case 'slate': return 'bedtime';
        case 'dark': return 'dark_mode';
        case 'black': return 'nightlight';
        case 'amoled': return 'brightness_3';
    }
  });

  private getEmptyState(): PersonaState {
    return {
      step: 'vibe-entry',
      vibeMessages: [],
      currentDraft: '',
      simulationHistory: [],
      simulationType: 'chat'
    };
  }

  // --- State Management ---
  pushState(newStatePartial: Partial<PersonaState>) {
    const current = this.state();
    const merged: PersonaState = { ...current, ...newStatePartial };
    const newStack = this.historyStack().slice(0, this.currentStateIndex() + 1);
    newStack.push(merged);
    this.historyStack.set(newStack);
    this.currentStateIndex.set(newStack.length - 1);
  }

  undo() {
    if (this.currentStateIndex() > 0) {
      this.currentStateIndex.update(i => i - 1);
    }
  }

  redo() {
    if (this.currentStateIndex() < this.historyStack().length - 1) {
      this.currentStateIndex.update(i => i - 1);
    }
  }

  setStep(step: PipelineStep) {
    if (this.state().step !== step) {
        this.pushState({ step });
    }
  }

  reset(clearStorage: boolean = true) {
    this.historyStack.set([this.getEmptyState()]);
    this.currentStateIndex.set(0);
    if (clearStorage && typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  initDirectorMode(initialDraft: string = '') {
    const state: PersonaState = {
        ...this.getEmptyState(),
        currentDraft: initialDraft,
        step: 'refine-director'
    };
    this.historyStack.set([state]);
    this.currentStateIndex.set(0);
  }
    
  get currentStateIndexValue() {
    return this.currentStateIndex();
  }

  // --- Inspiration Library Management (Global) ---
  
  async remixInspirationLibrary(): Promise<void> {
      try {
          const currentData = this.inspirationCategories();
          const remixedData = await this.gemini.remixInspiration(currentData, this.currentLang());
          this.inspirationCategories.set(remixedData);
      } catch (e) {
          throw e;
      }
  }

  async addAIInspirationCategories(): Promise<void> {
      try {
          const aiCategories = await this.gemini.generateInspirationQuestions(this.currentLang());
          this.inspirationCategories.update(current => {
             const nonAiCategories = current.filter(c => !c.id.startsWith('ai-gen'));
             return [...aiCategories, ...nonAiCategories];
          });
      } catch (e) {
          throw e;
      }
  }

  resetInspirationLibrary() {
      this.inspirationCategories.set(INITIAL_INSPIRATION_DATA);
      localStorage.removeItem(INSPIRATION_STORAGE_KEY);
      localStorage.removeItem(INSPIRATION_TIMESTAMP_KEY);
  }
}
