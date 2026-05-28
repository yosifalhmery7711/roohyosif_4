import Groq from "groq-sdk";

const getBaseApiUrl = () => {
  // Use relative path so that Vercel uses its own secure server-side rewrites (vercel.json)
  return "";
};

// Client-side helper that calls our backend proxy to avoid exposing the API key
export async function getGroqResponse(prompt: string): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("هذه الخدمة تتطلب اتصالاً بالإنترنت");
  }

  try {
    const baseUrl = getBaseApiUrl();
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || "";
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-Groq-API-Key'] = apiKey;
    }
    const response = await fetch(`${baseUrl}/api/groq`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch Groq response');
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("Groq Client Error:", error);
    throw error;
  }
}
