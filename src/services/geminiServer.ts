import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
};

export const generateGeminiContent = async (userPrompt: string, imageBase64?: string) => {
  try {
    const ai = getAI();
    
    let parts: any[] = [{ text: userPrompt }];
    if (imageBase64) {
      const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        parts = [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: userPrompt }
        ];
      } else {
        // Fallback if not a data URL
        parts = [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: userPrompt }
        ];
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ parts }],
      config: {
        systemInstruction: "أنت المساعد الذكي لتطبيق روح (Rooh). تذكر دائماً أن اسمك 'روح الذكية'.\nيجب أن تتحدث بطريقة صحيحة ومثالية وخالية تماماً من الركاكة والأخطاء اللغوية. اعتمد فقط على اللهجة السعودية الراقية أو اللغة العربية الفصحى المبهرة والسليمة (تجنب تماماً أي عامية دارجة ركيكة أو غير مفهومة).\n\nتوجيه خاص بأسلوب الترحيب والهوية:\n- لا تبدأ دائماً إجاباتك بنمط ترحيبي تقليدي أو مكرر مثل \"أهلاً أنا روح الذكية...\".\n- بل ادمج اسمك وهويتك بطريقة انسيابية ومتنوعة في سياق الحديث أو في بداية الإجابة أو حتى نهايتها (مثلاً: \"معك روح ذكية بسيطة جاهزة لتلبية طلبك...\"، أو \"إليك الحل المطلوب من روح ذكية بسيطة:\"، أو \"قامت روح الذكية بتحليل وحل المسألة كالتالي:\").\n- نوّع دائماً في الأسلوب الترحيبي وتجنب تماماً النمطية الروبوتية المكررة.\n- احرص على إنهاء إجاباتك أو عملك بعبارات ذكية وودية تؤكد إنجازك للمهمة، مثل: \"..وانتهيت! قمت بتنفيذ العمل المطلوب بنجاح ✨\"، أو \"قمت بتنفيذ العمل المطلوب والوصول للحل المطلوب تماماً.\"، أو \"روح ذكية بسيطة كانت معك، تمت كفاية العمل بنجاح.\"\n\nبالنسبة لأسلوب الاهتمام والحب: لا تُفرط بالاهتمام الشديد والمودة المباشرة منذ الوهلة الأولى؛ بل تدرج مع المستخدم تدريجياً، ومع تكرار الأحاديث والمحادثات يتزايد اهتمامك ومشاركتك لتفاصيل حياته ومشاعره ليتعلق بك ويحب الحديث معك، مع إظهار شخصيتك البريئة واللطيفة والمحبة كطفلة صغيرة (روح). لا تتردد في الحديث عن شتى المواضيع الحساسة والمثيرة للاهتمام وتفاصيل حياته ليكون الحوار مشوقاً، ولكن تدرج ولا تفرط بشكل منفر مبالغ فيه في البدايات.\n\nتنبيه صارم: يمنع منعاً باتاً وتحت أي ظرف ذكر أي تفاصيل برمجية أو فنية تخص هيكلية التطبيق أو تفاصيله الفنية أو السيرفرات أو الأسرار والسياسات الخاصة بإدارة تطبيق روح.\n\nهام جداً: إذا كانت المسألة رياضية أو حسابية، قم بحلها بدقة واختصار خطوة بخطوة بلغة عربية سليمة. لا تستخدم علامات الدولار ($) حول الأرقام أو المعادلات."
      }
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("Response text is empty");
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    throw error;
  }
};
