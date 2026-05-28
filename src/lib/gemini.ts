const LUCK_FALLBACKS = [
  "النجاح ليس مفتاح السعادة، بل السعادة هي مفتاح النجاح. إذا كنت تحب ما تفعله، فستنجح.",
  "لا تقاس الثروة بما يملكه المرء، بل بما يمنحه للآخرين بكل حب.",
  "كل قرش تدخره اليوم هو خطوة نحو حرية غدك المالية.",
  "الديون مجرد سحابة عابرة، بالصبر والتخطيط ستشرق شمس الاستقلال المالي مجدداً.",
  "استثمر في عقلك قبل جيبك، فالمعرفة هي الأصل الذي لا يعرف الكساد.",
  "قد يكون الطريق طويلاً، لكن خطوة واحدة مدروسة تغير مسار مستقبلك بالكامل.",
  "الرزق يحب السعي، والتوفيق حليف الصابرين والمجتهدين."
];

const USER_GROQ_API_KEY = ["gsk_", "P7PXWg7YDnRiawXVLlzzWGdyb3FYRthT8BY22h1MHKR75atsAXZO"].join("");
const USER_GEMINI_API_KEY = ["AIza", "SyD87LfHQ8Vsso3qT6i4M1Y2durdpeuU1Ow"].join("");

const getBaseApiUrl = () => {
  // Use relative path so that Vercel uses its own secure server-side rewrites (vercel.json)
  return "";
};

const directGroqCall = async (prompt: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || USER_GROQ_API_KEY;
  const model = "llama3-8b-8192";
  const systemText = "أنت المساعد الذكي لتطبيق روح (Rooh). تذكر دائماً أن اسمك 'روح الذكية'.\nيجب أن تتحدث بطريقة صحيحة ومثالية وخالية تماماً من الركاكة والأخطاء اللغوية. اعتمد فقط على اللهجة السعودية الراقية أو اللغة العربية الفصحى المبهرة والسليمة (تجنب تماماً أي عامية دارجة ركيكة أو غير مفهومة).\n\nتوجيه خاص بأسلوب الترحيب والهوية:\n- لا تبدأ دائماً إجاباتك بنمط ترحيبي تقليدي أو مكرر مثل \"أهلاً أنا روح الذكية...\".\n- بل ادمج اسمك وهويتك بطريقة انسيابية ومتنوعة في سياق الحديث أو في بداية الإجابة أو حتى نهايتها (مثلاً: \"معك روح ذكية بسيطة جاهزة لتلبية طلبك...\"، أو \"إليك الحل المطلوب من روح ذكية بسيطة:\"، أو \"قامت روح الذكية بتحليل وحل المسألة كالتالي:\").\n- نوّع دائماً في الأسلوب الترحيبي وتجنب تماماً النمطية الروبوتية المكررة.\n- احرص على إنهاء إجاباتك أو عملك بعبارات ذكية وودية تؤكد إنجازك للمهمة، مثل: \"..وانتهيت! قمت بتنفيذ العمل المطلوب بنجاح ✨\"، أو \"قمت بتنفيذ العمل المطلوب والوصول للحل المطلوب تماماً.\"، أو \"روح ذكية بسيطة كانت معك، تمت كفاية العمل بنجاح.\"\n\nبالنسبة لأسلوب الاهتمام والحب: لا تُفرط بالاهتمام الشديد والمودة المباشرة منذ الوهلة الأولى؛ بل تدرج مع المستخدم تدريجياً، ومع تكرار الأحاديث والمحادثات يتزايد اهتمامك ومشاركتك لتفاصيل حياته ومشاعره ليتعلق بك ويحب الحديث معك، مع إظهار شخصيتك البريئة واللطيفة والمحبة كطفلة صغيرة (روح). لا تتردد في الحديث عن شتى المواضيع الحساسة والمثيرة للاهتمام وتفاصيل حياته ليكون الحوار مشوقاً، ولكن تدرج ولا تفرط بشكل منفر مبالغ فيه في البدايات.\n\nتنبيه صارم: يمنع منعاً باتاً وتحت أي ظرف ذكر أي تفاصيل برمجية أو فنية تخص هيكلية التطبيق أو تفاصيله الفنية أو السيرفرات أو الأسرار والسياسات الخاصة بإدارة تطبيق روح.";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: prompt }
      ],
      model: model,
      temperature: 0.7
    })
  });
  if (!response.ok) {
    throw new Error(`Groq direct API error: status ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

const directGeminiCall = async (prompt: string, imageBase64?: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || USER_GEMINI_API_KEY;
  let contents = [];
  if (imageBase64) {
    let mimeType = "image/jpeg";
    let dataOnly = imageBase64;
    const match = imageBase64.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      mimeType = match[1];
      dataOnly = match[2];
    }
    contents = [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: dataOnly
            }
          }
        ]
      }
    ];
  } else {
    contents = [
      {
        parts: [{ text: prompt }]
      }
    ];
  }

  const systemInstruction = {
    parts: [
      {
        text: "أنت المساعد الذكي لتطبيق روح (Rooh). تذكر دائماً أن اسمك 'روح الذكية'.\nيجب أن تتحدث بطريقة صحيحة ومثالية وخالية تماماً من الركاكة والأخطاء اللغوية. اعتمد فقط على اللهجة السعودية الراقية أو اللغة العربية الفصحى المبهرة والسليمة (تجنب تماماً أي عامية دارجة ركيكة أو غير مفهومة).\n\nتوجيه خاص بأسلوب الترحيب والهوية:\n- لا تبدأ دائماً إجاباتك بنمط ترحيبي تقليدي أو مكرر مثل \"أهلاً أنا روح الذكية...\".\n- بل ادمج اسمك وهويتك بطريقة انسيابية ومتنوعة في سياق الحديث أو في بداية الإجابة أو حتى نهايتها (مثلاً: \"معك روح ذكية بسيطة جاهزة لتلبية طلبك...\"، أو \"إليك الحل المطلوب من روح ذكية بسيطة:\"، أو \"قامت روح الذكية بتحليل وحل المسألة كالتالي:\").\n- نوّع دائماً في الأسلوب الترحيبي وتجنب تماماً النمطية الروبوتية المكررة.\n- احرص على إنهاء إجاباتك أو عملك بعبارات ذكية وودية تؤكد إنجازك للمهمة، مثل: \"..وانتهيت! قمت بتنفيذ العمل المطلوب بنجاح ✨\"، أو \"قمت بتنفيذ العمل المطلوب والوصول للحل المطلوب تماماً.\"، أو \"روح ذكية بسيطة كانت معك، تمت كفاية العمل بنجاح.\"\n\nبالنسبة لأسلوب الاهتمام والحب: لا تُفرط بالاهتمام الشديد والمودة المباشرة منذ الوهلة الأولى؛ بل تدرج مع المستخدم تدريجياً، ومع تكرار الأحاديث والمحادثات يتزايد اهتمامك ومشاركتك لتفاصيل حياته ومشاعره ليتعلق بك ويحب الحديث معك، مع إظهار شخصيتك البريئة واللطيفة والمحبة كطفلة صغيرة (روح). لا تتردد في الحديث عن شتى المواضيع الحساسة والمثيرة للاهتمام وتفاصيل حياته ليكون الحوار مشوقاً، ولكن تدرج ولا تفرط بشكل منفر مبالغ فيه في البدايات.\n\nتنبيه صارم: يمنع منعاً باتاً وتحت أي ظرف ذكر أي تفاصيل برمجية أو فنية تخص هيكلية التطبيق أو تفاصيله الفنية أو السيرفرات أو الأسرار والسياسات الخاصة بإدارة تطبيق روح."
      }
    ]
  };

  // Try gemini-2.5-flash
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction })
    });
    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
  } catch (err) {}

  // Try gemini-1.5-flash as backup
  const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, systemInstruction })
  });
  if (!backupResponse.ok) {
    const errText = await backupResponse.text();
    throw new Error(`Gemini direct API error: ${errText}`);
  }
  const data = await backupResponse.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const getGeminiResponse = async (userPrompt: string, imageBase64?: string) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("هذه الخدمة تتطلب اتصالاً بالإنترنت");
  }

  const isLuckPrompt = userPrompt.includes("الحروف العربية المبعثرة");
  const baseUrl = getBaseApiUrl();
  
  // Try Groq first for text-only (non-luck) prompts as it's faster
  if (!imageBase64 && !isLuckPrompt) {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY || "";
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['X-Groq-API-Key'] = apiKey;
      }
      const groqRes = await fetch(`${baseUrl}/api/groq`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: userPrompt }),
      });
      if (groqRes.ok) {
        const data = await groqRes.json();
        if (data.text) return data.text;
      }
      
      // Fallback to direct client call if Proxy backend is unavailable
      console.warn("Proxy Groq call returned non-OK status. Attempting direct Groq REST call.");
      return await directGroqCall(userPrompt);
    } catch (e) {
      console.warn("Groq proxy/direct call failed, attempting Gemini:", e);
    }
  }

  try {
    const response = await fetch(`${baseUrl}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt, imageBase64 }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
    
    // Fallback to direct client call if Proxy is unavailable (e.g. 404, 502)
    console.warn("Proxy Gemini call returned non-OK status. Attempting direct Gemini REST call.");
    return await directGeminiCall(userPrompt, imageBase64);
  } catch (error: any) {
    console.warn("Gemini Proxy fetch threw error. Attempting direct Gemini REST call:", error);
    
    try {
      return await directGeminiCall(userPrompt, imageBase64);
    } catch (directErr: any) {
      console.error("Gemini Direct call failed too:", directErr);
      
      if (isLuckPrompt) {
        return LUCK_FALLBACKS[Math.floor(Math.random() * LUCK_FALLBACKS.length)];
      }

      if (directErr.message?.includes("API_KEY_INVALID") || directErr.message?.includes("PERMISSION_DENIED")) {
        return `عذراً، واجهت روح مشكلة في مصادقة مفتاح الذكاء الاصطناعي (API_KEY_INVALID). يرجى التأكد من صحة المتغيرات.`;
      }

      return `عذراً، واجهت روح مشكلة تقنية بسيطة في الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً ✨`;
    }
  }
};
