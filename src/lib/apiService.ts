import { GoogleGenAI } from '@google/genai';
import { ApiConfig } from '../context/ApiConfigContext';

export const callApi = async (config: ApiConfig, prompt: string, systemInstruction: string, isStream: boolean = true, fileData?: { data: string, mimeType: string }): Promise<any> => {
  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    
    const contents: any = { parts: [{ text: prompt }] };
    if (fileData) {
      contents.parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data.split(',')[1] // Remove data:mimeType;base64,
        }
      });
    }

    if (isStream) {
      return await ai.models.generateContentStream({
        model: config.model,
        contents: contents,
        config: { systemInstruction, temperature: 0.4 }
      });
    } else {
      return await ai.models.generateContent({
        model: config.model,
        contents: contents,
        config: { systemInstruction, temperature: 0.4 }
      });
    }
  } else if (config.provider === 'openrouter') {
    // OpenRouter uses OpenAI-compatible API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Asistente de notas de prensa",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        stream: isStream
      })
    });
    
    if (!response.ok) throw new Error('OpenRouter API error');
    
    if (isStream) {
      // Need to handle streaming for OpenRouter
      return response.body;
    } else {
      const data = await response.json();
      return { text: data.choices[0].message.content };
    }
  }
  throw new Error('Unsupported provider');
};
