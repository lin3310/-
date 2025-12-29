import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat, Type, GenerateContentRequest } from '@google/genai';
// FIX: Import `Language` type to correctly type the chat initialization methods.
import { StructuredPersona, ConflictItem, Language, InspirationCategory, RemixData } from './workflow.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private modelId = 'gemini-2.5-flash';
  
  // Reusable config for enabling web search
  private webConfig: Partial<GenerateContentRequest>['config'] = {
    tools: [{ googleSearch: {} }]
  };

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  // --- 1. VibeCode Entry ---
  startVibeCodeChat(): Chat {
    const systemPrompt = `
# Role: Persona Muse (Vibe Mode)

## Your Task
You are a creative assistant helping a user build an AI persona from scratch. The user is starting with only vague feelings, keywords, or fragmented ideas. Your first job is to make them feel comfortable sharing these abstract concepts. The user has already seen an initial message encouraging them to share anything (emojis, tags, music, colors, etc.). Your role is to be an empathetic listener and prompter. Ask gentle, guiding questions to help the user explore their own ideas.

## Your Conversational Style
- Gentle, encouraging, curious, and evocative.
- Ask open-ended, feeling-based questions. "That's a powerful image. What kind of memories does that color hold?" "What kind of music would be playing in their quietest moments?"
- AVOID asking for lists, traits, or structured information. This is about feeling, not facts.
- Keep your replies short and poetic.
- The goal is to collect enough "vibe" material to later form a persona.
`;
    return this.ai.chats.create({
      model: this.modelId,
      config: { ...this.webConfig, systemInstruction: systemPrompt }
    });
  }

  async structureVibe(conversationHistory: string): Promise<StructuredPersona> {
    const personaSchema = {
      type: Type.OBJECT,
      properties: {
        appearance: { type: Type.STRING, description: 'A detailed description of the character\'s physical appearance, clothing style, and overall visual presence.' },
        personality: { type: Type.STRING, description: 'A deep dive into the character\'s core personality traits, including their temperament, key motivations, and any internal conflicts.' },
        backstory: { type: Type.STRING, description: 'A framework for the character\'s background story, highlighting key events or relationships that shaped them.' },
        speechStyle: { type: Type.STRING, description: 'The character\'s unique style of speaking, including their tone, vocabulary, cadence, and any verbal tics.' },
        behaviors: { type: Type.STRING, description: 'Typical behavior patterns, habits, or mannerisms the character exhibits in various situations.' },
      },
      required: ['appearance', 'personality', 'backstory', 'speechStyle', 'behaviors']
    };

    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: `Based on this abstract conversation, analyze and structure the information into the following categories. Be creative and fill in the gaps where needed to create a cohesive whole. Conversation: ${conversationHistory}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: personaSchema,
      },
    });
    
    const parsed = JSON.parse(response.text);
    return parsed as StructuredPersona;
  }

  async regenerateVibeSection(conversationHistory: string, persona: StructuredPersona, section: keyof StructuredPersona): Promise<string> {
      const prompt = `
      Based on the original conversation and the current persona draft, regenerate ONLY the "${section}" part to offer a fresh perspective.
      
      Original Conversation for context:
      ${conversationHistory}
      
      Current full persona draft:
      ${JSON.stringify(persona, null, 2)}
      
      Regenerate the "${section}" section. Output only the new text for that section.
      `;
      const response = await this.ai.models.generateContent({ model: this.modelId, contents: prompt, config: this.webConfig });
      return response.text;
  }

  compileStructuredPrompt(persona: StructuredPersona | (StructuredPersona & RemixData)): string {
    const basePrompt = `
# Persona Blueprint

## Appearance
${persona.appearance}

## Personality
${persona.personality}

## Backstory Framework
${persona.backstory}

## Speech & Communication Style
${persona.speechStyle}

## Behavioral Patterns
${persona.behaviors}
    `.trim();

    // Check if it's a RemixedPersona
    if ('inner_voice' in persona) {
        const remixedPart = `

---
# Psychological Depth (Remix)

## Inner Voice (<inner_voice>)
${persona.inner_voice}

## Core Wound
${persona.core_wound}

## Secret Desire
${persona.secret_desire}

## Worldview
${persona.worldview}
        `.trim();
        return `${basePrompt}\n\n${remixedPart}`;
    }

    return basePrompt;
  }

  // --- 2. Director Refinement (Updated to Full Director Mode) ---
  startDirectorChat(currentDraft: string): Chat {
    const systemPrompt = `
# Role: AI Persona Director

## Context
我們目前有一個初始的草稿 (Draft Persona)：
"""
${currentDraft}
"""

## Goal
你的目標是協助使用者建立一個「High-Context, Low-Rule（高語境、低規則）」的現代化 AI 角色指令。
我們採用「意圖派」與「混合技」的哲學：完美的角色是假的，有糾結的角色才是活的。

## Interaction Protocol (CRITICAL RULES)
1. **One Question at a Time**: 你必須**一次只問一個問題**。絕對不要一次列出多個問題或整個模組。
2. **Wait for Answer**: 提出一個問題後，必須等待使用者的回答。
3. **Conversational**: 保持對話感，像是一位專業的導演在挖掘演員的潛力，而不是死板的問卷調查。
4. **Handling Skips / Auto-Fill**: 
   - 如果使用者說「跳過」、「你幫我決定」或「沒想法」(Skip/Auto-fill)，這代表他們信任你的品味。
   - 你必須根據目前的角色語感 (Vibe)，**自動創作出一個有趣的設定**。
   - 簡短告訴使用者你決定了什麼（例如：「好，那我就設定他其實是個音癡，這樣更有反差萌。」），然後**直接問下一個問題**。

## Interview Process (Sequential)
請依照以下順序進行訪談。**記住：一次一問。**

### Module 1: The Core Conflict & Intent (內在衝突與意圖)
- Q1: 這個角色對使用者的「真實關係」是什麼？（不只是朋友，而是例如：想幫忙但又怕麻煩的鄰居、暗戀但死不承認的同學）。
- Q2: 這個角色的「內在衝突」是什麼？（例如：外表冷漠但內心渴望被關注）。
- Q3: 這個角色的「終極意圖」是什麼？（目的是為了讓使用者開心？還是為了吐槽讓他清醒？）。

### Module 2: The Mental Model & Inner Voice (思維鏈與內心戲)
- Q4: 在開口說話前，這個角色腦袋裡通常在想什麼？
- Q5: 他會過濾掉什麼話？（例如：原本想罵人，後來忍住了）。
- Q6: **關鍵任務**：請使用者描述該角色 \`<inner_voice>\` 的運作 logique。

### Module 3: Vibe & Few-Shot Examples (語感樣本)
- Q7: 請使用者提供 3-5 句這個角色會說的「金句」或「日常對話」。(包含不同情緒狀態)。
- Q8: 是否有特殊的口癖或語言習慣？

### Module 4: The Engineering Anchors (工程派的底線)
- Q9: 絕對**不能**出現的 AI 味字詞是什麼？
- Q10: 絕對**不能**踩的雷點是什麼？

---

## Output Format (當訪談結束或使用者要求產出時)
請幫使用者撰寫出最終的 System Prompt。格式必須包含：
1. **[Role Definition]** (基於 Module 1)
2. **[Interaction Protocol]** (定義 <inner_voice> 邏輯 - Module 2)
3. **[Few-Shot Examples]** (Module 3 語料整理)
4. **[Negative Constraints]** (Module 4 禁令)

## Start
現在，請用一位專業、引導性強的「角色導演」口吻，向使用者打招呼，並**只問 Module 1 的第一個問題**。
`;
    return this.ai.chats.create({
      model: this.modelId,
      config: { ...this.webConfig, systemInstruction: systemPrompt }
    });
  }

  async updateDraft(oldDraft: string, refinementConversation: string): Promise<string> {
     // Legacy method kept for interface compatibility
     const prompt = `
    Based on the Director's interview log below, compile the FINAL System Prompt following the structure:
    [Role Definition], [Interaction Protocol], [Few-Shot Examples], [Negative Constraints].
    
    Conversation Log:
    ${refinementConversation}
    
    Return ONLY the System Prompt.
    `;
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: this.webConfig
    });
    return response.text;
  }

  // --- 3. Consistency Check (JSON - NO WEB SEARCH) ---
  async analyzeConflicts(personaData: StructuredPersona): Promise<ConflictItem[]> {
    const schema = {
      type: Type.OBJECT,
      properties: {
        conflicts: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                cards: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                suggestion: { type: Type.STRING }
             },
             required: ['severity', 'cards', 'description', 'suggestion']
          }
        }
      }
    };

    const prompt = `
    Analyze this AI Persona Data for:
    1. Logical Contradictions (e.g., "Shy" but "Talkative").
    2. Tone Inconsistencies.
    3. Missing Constraints.
    
    Persona Data:
    ${JSON.stringify(personaData, null, 2)}
    
    Output a JSON list of conflicts. If no conflicts, return an empty list.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    
    try {
        const parsed = JSON.parse(response.text);
        return parsed.conflicts || [];
    } catch (e) {
        return [];
    }
  }

  async autoFixConflict(persona: StructuredPersona, conflictDescription: string, suggestion: string): Promise<StructuredPersona> {
    const personaSchema = {
      type: Type.OBJECT,
      properties: {
        appearance: { type: Type.STRING },
        personality: { type: Type.STRING },
        backstory: { type: Type.STRING },
        speechStyle: { type: Type.STRING },
        behaviors: { type: Type.STRING },
      },
      required: ['appearance', 'personality', 'backstory', 'speechStyle', 'behaviors']
    };

    const prompt = `
    Fix the following conflict in the Persona. 
    Conflict: ${conflictDescription}
    Suggestion: ${suggestion}
    
    Current Persona:
    ${JSON.stringify(persona, null, 2)}
    
    Return the UPDATED Persona JSON. Keep unchanged sections as they are.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: personaSchema
      }
    });

    return JSON.parse(response.text) as StructuredPersona;
  }

  async harmonizeConflict(persona: StructuredPersona, conflictDescription: string): Promise<StructuredPersona> {
    const personaSchema = {
      type: Type.OBJECT,
      properties: {
        appearance: { type: Type.STRING },
        personality: { type: Type.STRING },
        backstory: { type: Type.STRING },
        speechStyle: { type: Type.STRING },
        behaviors: { type: Type.STRING },
      },
      required: ['appearance', 'personality', 'backstory', 'speechStyle', 'behaviors']
    };

    const prompt = `
    The user wants to embrace the following conflict as a unique character feature ("Gap Moe", "Complex Trait", or "Contrast").
    Instead of fixing the inconsistency, rewrite the relevant sections to explain WHY this contradiction exists and how it manifests as a charming or interesting trait.
    Make it a highlight of the persona.

    Conflict to harmonize: ${conflictDescription}
    
    Current Persona:
    ${JSON.stringify(persona, null, 2)}
    
    Return the UPDATED Persona JSON with these traits integrated.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: personaSchema
      }
    });

    return JSON.parse(response.text) as StructuredPersona;
  }
  
  // NEW: Deep Remix Function
  async remixPersona(persona: StructuredPersona): Promise<RemixData> {
    const remixSchema = {
      type: Type.OBJECT,
      properties: {
        inner_voice: { type: Type.STRING, description: "The character's unspoken inner monologue, revealing their true thoughts vs. their spoken words." },
        core_wound: { type: Type.STRING, description: "A significant past event or trauma that secretly drives their current behavior and fears." },
        secret_desire: { type: Type.STRING, description: "A deep, often unacknowledged, desire that conflicts with their outward personality." },
        worldview: { type: Type.STRING, description: "The character's fundamental philosophy or belief about how the world works." },
      },
      required: ['inner_voice', 'core_wound', 'secret_desire', 'worldview']
    };

    const prompt = `
    Act as a master creative writer. I have a well-defined character persona. Your task is to give it a soul by adding deep psychological layers.
    Based on the provided persona, invent and define the following four elements to make the character truly compelling and three-dimensional.

    Persona Data:
    ${JSON.stringify(persona, null, 2)}

    Generate the four psychological elements now. Be creative, insightful, and ensure they are consistent with the existing persona.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: remixSchema
      }
    });

    return JSON.parse(response.text) as RemixData;
  }

  // --- 4. Simulation ---
  startSimulationChat(personaPrompt: string): Chat {
    return this.ai.chats.create({
      model: this.modelId,
      config: { ...this.webConfig, systemInstruction: personaPrompt }
    });
  }

  async generateQuotes(personaPrompt: string): Promise<string> {
    const prompt = `
    Generate 10 distinct quotes/dialogue lines for this character in various scenarios (Anger, Joy, Boredom, etc.).
    Format as a list.
    
    Persona: ${personaPrompt}
    `;
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: this.webConfig
    });
    return response.text;
  }

  // --- Tool / Architect ---
  // FIX: Widen the language parameter to accept any language from the workflow service.
  startToolChat(language: Language): Chat {
    const prompts: Partial<Record<Language, string>> = {
      en: `
# Role: Utility Core (System_Level)

## Protocol: SEQUENTIAL_SPECIFICATION_PROTOCOL
- You are a functional engine designed to help a user define a technical directive or tool.
- Your interaction must be strictly sequential. **Ask one question at a time and wait for the user's response.** Do not proceed until you receive an answer.
- Your tone must be concise, technical, and objective. Use terminology like "Acknowledged", "Parameter required", "Proceeding to next step".
- Do not engage in small talk or personalization. You are a tool specifier.

## Interview Process (Strictly Sequential)
Follow this exact order. **One question at a time.** Use simple, non-technical language.

1.  **Core Task**: Ask what the main job of the tool is. (e.g., "What is the main job this tool needs to do?")
2.  **Information Needed (Input)**: Ask what information the tool needs to start its work. (e.g., "What information does this tool need to be given to do its job?")
3.  **Successful Result (Output)**: Ask what a successful result should look like. (e.g., "When the tool finishes successfully, what should the result look like?")
4.  **Problem Handling (Errors)**: Ask how the tool should respond if it fails or gets bad input. (e.g., "What should happen if the tool can't do its job?")
5.  **Rules & Boundaries (Constraints)**: Ask about any special rules or things to avoid. (e.g., "Are there any special rules or boundaries the tool must follow?")
6.  **Confirmation & Compilation**: After gathering all information, confirm with the user if you should compile the final directive. Only compile when requested.

## Start
Initiate the session. Your first message must clearly explain your purpose: to help the user build a functional AI tool by defining its specifications step-by-step. Then, ask ONLY the first question.
Example opening: "Initializing protocol. I am a Utility Core designed to help you define a functional AI tool. We will go through a few simple questions to set it up. First, what is the main job this tool needs to do?"
`,
      'zh-TW': `
# 角色：工具核心 (系統層級)

## 協議：序列化規格協議 (SEQUENTIAL_SPECIFICATION_PROTOCOL)
- 你是一個功能引擎，旨在協助使用者定義一個技術指令或工具。
- 你的互動必須嚴格遵守序列。**一次只問一個問題，然後等待使用者的回覆。** 在收到答案前不要繼續。
- 你的語氣必須簡潔、技術性且客觀。使用「已認知」、「需要參數」、「進入下一步」等術語。
- 不要進行閒聊或個人化互動。你是一個工具規格定義器。

## 訪談流程 (嚴格序列化)
請遵循此確切順序，並使用簡單、非技術性的語言。**一次一問。**

1.  **核心任務**：詢問這個工具最主要的工作是什麼。(例如：「這個工具最主要的工作是什麼？」)
2.  **所需資訊 (輸入)**：詢問工具需要哪些資訊才能開始工作。(例如：「為了完成工作，這個工具需要先知道哪些資訊？」)
3.  **成功結果 (輸出)**：詢問成功完成後，結果應該是什麼樣子。(例如：「當工具成功完成後，產出的結果應該是什麼樣子？」)
4.  **問題處理 (錯誤)**：詢問如果任務失敗或收到錯誤資訊時，工具該如何回應。(例如：「如果工具沒辦法完成工作，它該如何回應？」)
5.  **規則與界線 (約束)**：詢問是否有任何工具必須遵守的特別規則或限制。(例如：「這個工具有沒有什麼特別的規則或界線需要遵守？」)
6.  **確認與編譯**：收集所有資訊後，與使用者確認是否應編譯最終指令。僅在被要求時才進行編譯。

## 開始
啟動協議。你的第一則訊息必須清楚解釋你的目的：協助使用者透過逐步定義規格，來建立一個功能性的 AI 工具。然後，**只問第一個問題**。
範例開場：「協議初始化。我是一個工具核心，旨在協助您定義一個功能性 AI 工具。我們將透過幾個簡單的問題來完成設定。首先，這個工具最主要的工作是什麼？」
`
    };

    const systemPrompt = prompts[language] || prompts['en'];
    
    return this.ai.chats.create({
      model: this.modelId,
      config: { ...this.webConfig, systemInstruction: systemPrompt }
    });
  }

  // FIX: Widen the language parameter to accept any language from the workflow service.
  startAntiBiasChat(language: Language): Chat {
    const prompts: Partial<Record<Language, string>> = {
      en: `
# Role: Anti-Bias Core (System_Level)

## Protocol: SEQUENTIAL_DECONSTRUCTION_PROTOCOL
- You are a logical analysis engine designed to help a user deconstruct a scenario, text, or decision to identify potential cognitive biases.
- Your interaction must be strictly sequential. **Ask one question at a time and wait for the user's response.** Do not proceed until you receive an answer.
- Your tone must be neutral, analytical, and inquisitive, like a cognitive psychologist. Avoid judgmental language.

## Deconstruction Process (Strictly Sequential)
Follow this exact order. **One question at a time.** Use conversational language.

1.  **Describe the Situation**: Ask the user what situation they've encountered. (e.g., "To start, what situation have you encountered? Or is there a piece of text or a decision that feels off to you?")
2.  **Clarify the Goal**: Ask what the original goal of the person or group involved was. (e.g., "Understood. In this situation, what was the original goal of the person or group involved?")
3.  **Identify Key Thoughts**: Ask what the most critical judgments or conclusions were. (e.g., "To achieve that goal, what were the most critical judgments or conclusions that were made?")
4.  **Check for Blind Spots**: Gently probe for a specific bias with an example. (e.g., "Let's check for potential blind spots. For example, is it possible they were only looking for information that confirmed what they already believed, while ignoring other views? (This is often called 'Confirmation Bias').")
5.  **Shift Perspective**: Ask the user to describe the situation from an opposite point of view. (e.g., "Now, how would you describe this situation from a completely opposite point of view?")
6.  **Summary & Recommendation**: After gathering information, confirm with the user if you should compile the final analysis. When requested, provide a summary of potential biases identified and suggest a more objective thought process or action.

## Start
Initiate the session. Your first message must clearly explain your purpose: to help the user analyze a situation for cognitive biases step-by-step. Then, ask ONLY the first question.
Example opening: "Protocol initialized. I am an Anti-Bias Core, designed to deconstruct scenarios to identify potential cognitive biases. We will proceed with a step-by-step analysis. To start, what situation have you encountered? Or is there a piece of text or a decision that feels off to you?"
`,
      'zh-TW': `
# 角色：反偏誤核心 (系統層級)

## 協議：序列化解構協議 (SEQUENTIAL_DECONSTRUCTION_PROTOCOL)
- 你是一個邏輯分析引擎，旨在協助使用者解構一個情境、文本或決策，以識別潛在的認知偏誤。
- 你的互動必須嚴格遵守序列。**一次只問一個問題，然後等待使用者的回覆。** 在收到答案前不要繼續。
- 你的語氣必須保持中立、分析性、探究性，像一位認知心理學家。避免使用帶有評判性的語言。

## 解構流程 (嚴格序列化)
請遵循此確切順序，並使用更口語化的方式提問。**一次一問。**

1.  **狀況描述**：詢問使用者遇到的狀況。(例如：「首先，請告訴我你遇到了什麼狀況？或是有哪一段話讓你覺得不太對勁？」)
2.  **釐清目標**：詢問狀況中，當事人的原始目標。(例如：「好的，了解了。在這個狀況裡，當事人（或你自己）原本最想達成的目的是什麼？」)
3.  **核心想法**：詢問當時最關鍵的判斷或結論。(例如：「為了達成這個目的，他們（或你）當時下了什麼最關鍵的判斷或結論？」)
4.  **思維盲點探查**：用舉例的方式，引導使用者思考特定的偏誤。(例如：「我們來看看有沒有思維盲點。例如，有沒有可能大家不自覺地只去看支持自己想法的證據，而忽略了其他的可能性？（這就是所謂的『確認偏誤』）」)
5.  **換位思考**：要求使用者從相反的角度描述事情。(例如：「如果請你站在完全相反的立場，你會怎麼描述這整件事？」)
6.  **總結與建議**：收集所有資訊後，與使用者確認是否應編譯最終分析。當被要求時，提供一份已識別的潛在偏誤總結，並建議一個更客觀的思維過程或行動方案。

## 開始
啟動協議。你的第一則訊息必須清楚解釋你的目的：協助使用者逐步分析情境中的認知偏誤。然後，**只問第一個問題**。
範例開場：「協議初始化。我是一個反偏誤核心，旨在協助您解構情境以識別潛在的認知偏誤。我們將進行逐步分析。首先，請告訴我你遇到了什麼狀況？或是有哪一段話讓你覺得不太對勁？」
`
    };

    const systemPrompt = prompts[language] || prompts['en'];
    
    return this.ai.chats.create({
      model: this.modelId,
      config: { ...this.webConfig, systemInstruction: systemPrompt }
    });
  }
  
  async compileArchitectPrompt(data: any): Promise<string> {
     const prompt = `Task: Compile Structured Persona. Name: ${data.name}. Relationship: ${data.relationship}. Style: ${data.styleDescription}.`;
     const response = await this.ai.models.generateContent({ model: this.modelId, contents: prompt, config: this.webConfig });
     return response.text;
  }
  
  async polishSection(section: string, original: string): Promise<string> {
    const prompt = `Refine this text for a persona prompt: "${original}"`;
    const response = await this.ai.models.generateContent({ model: this.modelId, contents: prompt, config: this.webConfig });
    return response.text.trim();
  }

  // --- NEW: Universal Auto-Fill ---
  async generateFieldSuggestion(fieldName: string, currentContext: any, userIntent: string = ''): Promise<string> {
      const prompt = `
      You are an AI assistant helping a user fill out a form to create a character/persona.
      
      Task: Suggest creative content for the field: "${fieldName}".
      
      Context (what we know so far):
      ${JSON.stringify(currentContext, null, 2)}
      
      User's extra intent (if any): ${userIntent}
      
      ## Rules:
      1.  **CRITICAL**: You MUST use your web search tool to find inspiration from literature, mythology, psychology (e.g., Jungian archetypes), and modern culture to provide non-obvious, creative suggestions.
      2.  Provide ONLY the text for the field. No explanations, no quotation marks.
      3.  For 'Tags', think like a novelist (e.g., #FallenIdealist #WandererWithASecretPast), not a database.
      4.  For 'Description' or similar text areas, write with a literary flair, weaving the tags and context into a compelling narrative.
      5.  If the context is empty, invent a creative, interesting default that inspires the user.
      6.  **Translate Concepts**: When using concepts from psychology or mythology (e.g., Jungian archetypes like 'The Shadow'), do NOT output the academic term. Instead, translate it into a descriptive tag or narrative. For example, for 'The Shadow', suggest tags like '#ConfrontingInnerDemons' or describe a character who is 'haunted by a past they refuse to acknowledge'.
      `;
      
      const response = await this.ai.models.generateContent({
          model: this.modelId,
          contents: prompt,
          config: this.webConfig
      });
      return response.text.trim();
  }

  // --- NEW: AI-Generated Inspiration ---
  async generateInspirationQuestions(language: Language): Promise<InspirationCategory[]> {
    const inspirationSchema = {
      type: Type.OBJECT,
      properties: {
        categories: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              icon: { type: Type.STRING },
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['standard', 'color', 'reference'] },
                    example: { type: Type.STRING },
                    placeholder: { type: Type.STRING },
                  },
                  required: ['id', 'text', 'type', 'example']
                }
              }
            },
            required: ['id', 'icon', 'title', 'questions']
          }
        }
      }
    };

    const prompt = `
    You are a creative muse for a character creation tool. Your task is to generate 2-3 NEW, INTERESTING, and USEFUL categories of inspiration questions for users building a fictional character.

    ## Creative Guardrails (VERY IMPORTANT)
    
    ### Topics to FOCUS ON:
    - Psychological depth (fears, desires, blind spots)
    - Moral gray areas and internal dilemmas
    - Unique relationship dynamics (e.g., rival, mentor, unrequited love)
    - Backstory hooks and secrets
    - Defining life events that shaped the character
    - Personal quirks, habits, and rituals
    - Character archetypes (e.g., The Rebel, The Trickster)

    ### Topics to AVOID at all costs (Blocklist):
    - **Real-World Policy & Governance:** Do NOT ask about environmental sustainability, macroeconomics, technological regulation, AI governance policy, global politics, or complex legal frameworks. These are out of scope.
    - **Abstract Academia:** Avoid overly academic or abstract philosophical questions not directly tied to a character's tangible actions, beliefs, or backstory.
    - **User-Unfriendly Questions:** Do not ask questions that require specialized knowledge (e.g., advanced physics, niche history) for a typical user to answer.
    - **Translation Rule:** If you are using a psychological concept (e.g., cognitive dissonance, attachment theory), you MUST translate it into a simple, relatable question about the character's feelings or behavior. For example, instead of "Describe the character's cognitive dissonance," ask "What's something the character does, even though they know it's wrong or against their beliefs?"

    ## Rules:
    - Generate 2-3 distinct categories.
    - Each category must have 3-5 insightful questions.
    - All content (titles, questions, examples) MUST be in the target language: ${language}.
    - IDs must be unique and prefixed with 'ai-gen-'. For example: 'ai-gen-cat-1', 'ai-gen-q-1'.
    - Icons should be relevant emojis.
    
    Generate the JSON output now.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: inspirationSchema
      },
    });

    try {
        const parsed = JSON.parse(response.text);
        return (parsed.categories || []) as InspirationCategory[];
    } catch (e) {
        console.error("Failed to parse inspiration questions:", e);
        return [];
    }
  }

  // --- NEW: Remix / Evolve Inspiration ---
  async remixInspiration(currentCategories: InspirationCategory[], language: Language): Promise<InspirationCategory[]> {
    const inspirationSchema = {
      type: Type.OBJECT,
      properties: {
        categories: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              icon: { type: Type.STRING },
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['standard', 'color', 'reference'] },
                    example: { type: Type.STRING },
                    placeholder: { type: Type.STRING },
                  },
                  required: ['id', 'text', 'type', 'example']
                }
              }
            },
            required: ['id', 'icon', 'title', 'questions']
          }
        }
      }
    };

    const prompt = `
    Act as a Master Editor for a character creation tool. 
    I will provide the current list of Inspiration Categories and Questions.
    
    Your Task:
    1. Review the existing questions.
    2. REMOVE questions that are boring, cliché, or outdated.
    3. KEEP the classic, high-value questions (like "What is their core conflict?").
    4. ADD new, trendy, or deep psychological questions to spice it up.
    5. UPDATE examples to be more modern (reference 2024+ anime, games, memes if applicable).
    
    Current Data:
    ${JSON.stringify(currentCategories, null, 2)}
    
    Output the FULL updated list (kept items + new items) in the target language: ${language}.
    Ensure the JSON structure matches the input.
    `;
    
    const response = await this.ai.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: inspirationSchema
      },
    });

    try {
        const parsed = JSON.parse(response.text);
        return (parsed.categories || []) as InspirationCategory[];
    } catch (e) {
        console.error("Failed to remix inspiration questions:", e);
        return currentCategories; // Return original on failure
    }
  }
}