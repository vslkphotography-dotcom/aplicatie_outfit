import { GoogleGenAI, Type } from "@google/genai";
import { Category, ClothingItem, OutfitRecommendation, WeatherData, Occasion } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanBase64 = (base64: string) => base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

export const analyzeClothingItem = async (base64Image: string): Promise<{ category: Category; description: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(base64Image) } },
          { text: `Analyze this clothing item. Classify it into one of these exact categories: ${Object.values(Category).join(', ')}. Also provide a short, 5-word visual description (color, style).` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: Object.values(Category) },
            description: { type: Type.STRING }
          },
          required: ['category', 'description']
        }
      }
    });
    const result = JSON.parse(response.text || '{}');
    return {
      category: Object.values(Category).find(c => c === result.category) || Category.TOPS,
      description: result.description || "Articol vestimentar"
    };
  } catch (error) {
    return { category: Category.TOPS, description: "Articol nou" };
  }
};

export const getRealWeather = async (location: string): Promise<WeatherData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for the current temperature (in Celsius) and weather condition in ${location} right now. Return a JSON with properties: temp (number), condition (string, in Romanian), location (string).`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    const text = response.text || "{}";
    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { temp: data.temp || 0, condition: data.condition || 'Indisponibil', location: data.location || location };
  } catch (error) {
    return { temp: 0, condition: "Offline", location: location };
  }
};

export const getOutfitRecommendation = async (weather: WeatherData, wardrobe: ClothingItem[], occasion: Occasion): Promise<OutfitRecommendation> => {
  try {
    const cleanClothes = wardrobe.filter(i => i.isClean);
    if (cleanClothes.length === 0) throw new Error("Nu ai haine curate!");
    const clothesList = cleanClothes.map(c => `- ID: ${c.id}, Category: ${c.category}, Desc: ${c.description}`).join('\n');
    const prompt = `Context: Personal stylist. Location: ${weather.location}. Weather: ${weather.temp}°C, ${weather.condition}. Occasion: ${occasion}. Wardrobe: ${clothesList}. Task: Select outfit.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            outfitName: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ['selectedItemIds', 'outfitName', 'reasoning']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { selectedItemIds: [], outfitName: "Eroare", reasoning: "Verifică garderoba." };
  }
};

export const generateVirtualTryOn = async (userImageBase64: string, clothingItems: ClothingItem[]): Promise<string> => {
    const parts = [
      { text: "Virtual try-on. Replace clothes on person (first image) with items provided." },
      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(userImageBase64) } },
      ...clothingItems.map(item => ({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(item.image) } })),
    ];
    try {
       const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } });
       for (const candidate of response.candidates || []) {
           for (const part of candidate.content.parts) {
               if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
           }
       }
       throw new Error("No image generated");
    } catch (error) { throw error; }
}

export const getFashionTrends = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Short fashion update for Romania (3 sentences)." });
        return response.text || "Indisponibil.";
    } catch (e) { return "Nu s-au putut încărca trendurile."; }
}