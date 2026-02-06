import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || ''; // In a real deployment this comes from env

export const createClient = (customKey?: string) => {
  const key = customKey || apiKey;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const generateSummary = async (prompt: string, modelId: string, client: GoogleGenAI | null): Promise<string> => {
  if (!client) return "Error: API Key missing.";

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please check connection and quota.";
  }
};

export const analyzeDiscrepancies = async (dataA: any[], dataB: any[], modelId: string, client: GoogleGenAI | null): Promise<string> => {
    if (!client) return "Error: API Key missing.";
    
    // Truncate data for demo purposes to avoid huge payload
    const snippetA = JSON.stringify(dataA.slice(0, 10));
    const snippetB = JSON.stringify(dataB.slice(0, 10));

    const prompt = `
      You are a Regulatory Compliance Agent.
      Analyze these two dataset snippets for inconsistencies.
      Dataset A (Supplier): ${snippetA}
      Dataset B (Customer): ${snippetB}
      
      Identify potential gaps in serial numbers or delivery dates.
      Return a summary in Markdown format using coral color for alerts.
    `;

    try {
        const response: GenerateContentResponse = await client.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        return response.text || "Analysis failed.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Error analyzing data.";
    }
};

export const standardizeDataset = async (rawData: string, modelId: string, client: GoogleGenAI | null): Promise<any[]> => {
    if (!client) throw new Error("API Key missing");

    const prompt = `
    You are a Data Engineering Agent. Transform the following raw input data into a JSON array of objects strictly following this schema:
    {
      "SupplierID": string,
      "Category": string,
      "LicenseNo": string,
      "Model": string,
      "LotNO": string,
      "SerialNo": string,
      "CustomerID": string,
      "DeliverDate": string (YYYY-MM-DD),
      "Quantity": number
    }

    If the input is missing fields, infer reasonable defaults or mark as "UNKNOWN".
    If the input is unstructured, extract the relevant entities.
    Return ONLY valid JSON. Do not use Markdown formatting.

    Raw Data:
    ${rawData.substring(0, 10000)} 
    `;
    // Note: Truncating rawData to avoid token limits in this demo
    
    try {
        const response: GenerateContentResponse = await client.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        
        let cleanJson = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
        if (!cleanJson) return [];
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Standardization Error:", error);
        return [];
    }
};
