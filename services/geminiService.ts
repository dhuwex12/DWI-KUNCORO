

import { GoogleGenAI, Modality, Type } from "@google/genai";
// FIX: Added 'CreativeConcept' to the import list to resolve a type error.
import { UploadedImage, CreativeDirection, AdGenResult, ProductContext, PhotoStyle, CopyResult, AiRecommendations, Scene, CreativeConcept, LpGoal, LpFramework, LpResult, LpScript, LpSection, FashionOptions, PosterConfig } from '../types';

// API Key Management
class ApiKeyManager {
  private primaryKey: string | undefined = process.env.API_KEY;
  private backupKeys: string[] = [];
  private currentKeyIndex: number = -1; // -1 for primary key

  constructor() {
    this.loadBackupKeys();
  }

  private loadBackupKeys() {
    if (typeof window === 'undefined') return;
    try {
      const storedKeysRaw = localStorage.getItem('backup_api_keys');
      if (storedKeysRaw) {
        const storedKeys = JSON.parse(storedKeysRaw);
        if (Array.isArray(storedKeys)) {
          this.backupKeys = storedKeys;
        }
      }
    } catch (e) {
      console.error("Gagal memuat kunci API cadangan dari localStorage", e);
    }
  }

  public updateBackupKeys(keys: string[]) {
    this.backupKeys = keys;
    if (typeof window !== 'undefined') {
        localStorage.setItem('backup_api_keys', JSON.stringify(keys));
    }
    this.currentKeyIndex = -1; // Reset to primary key
  }

  private getNextKey(): string {
    if (this.currentKeyIndex === -1) {
        // trying primary key
        if (this.primaryKey) {
            return this.primaryKey;
        } else {
            // primary key not set, try first backup
            this.currentKeyIndex = 0;
        }
    }
    
    if (this.backupKeys.length === 0) {
        if(this.primaryKey) return this.primaryKey;
        throw new Error("Tidak ada Kunci API yang disediakan. Harap atur variabel lingkungan API_KEY Anda atau tambahkan kunci cadangan.");
    }

    if(this.currentKeyIndex >= this.backupKeys.length){
        throw new Error("Semua Kunci API telah dicoba dan gagal.");
    }
    
    const key = this.backupKeys[this.currentKeyIndex];
    return key;
  }
  
  public rotateKey() {
      if(this.currentKeyIndex === -1 && this.backupKeys.length > 0) {
          this.currentKeyIndex = 0;
      } else if (this.backupKeys.length > 0) {
        this.currentKeyIndex++;
      }
      console.log(`Berpindah ke indeks kunci: ${this.currentKeyIndex}`);
  }

  public getClient(): GoogleGenAI {
    const key = this.getNextKey();
    if (!key) {
      throw new Error("Tidak ada Kunci API yang valid.");
    }
    return new GoogleGenAI({ apiKey: key });
  }
}

export const apiKeyManager = new ApiKeyManager();


// --- NEW MODEL MANAGER ---
type ModelTask = 'image' | 'text' | 'video_fast' | 'video_hq' | 'tts';

export interface ModelSettings {
    image: string;
    text: string;
    video_fast: string;
    video_hq: string;
    tts: string;
}

class ModelManager {
    private settings: ModelSettings;
    private defaults: ModelSettings = {
        image: 'gemini-2.5-flash-image',
        text: 'gemini-2.5-flash',
        video_fast: 'veo-3.1-fast-generate-preview',
        video_hq: 'veo-3.1-generate-preview',
        tts: 'gemini-2.5-flash-preview-tts',
    };

    constructor() {
        this.settings = this.loadModels();
    }

    private loadModels(): ModelSettings {
        if (typeof window === 'undefined') return this.defaults;
        try {
            const stored = localStorage.getItem('ai_model_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Ensure all keys are present, falling back to defaults if not
                return { ...this.defaults, ...parsed };
            }
        } catch (e) {
            console.error("Gagal memuat pengaturan model dari localStorage:", e);
        }
        return this.defaults;
    }

    private saveModels() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('ai_model_settings', JSON.stringify(this.settings));
        }
    }

    public getSettings(): ModelSettings {
        return this.settings;
    }

    public updateSettings(newSettings: Partial<ModelSettings>) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveModels();
    }

    public getModel(task: ModelTask): string {
        return this.settings[task] || this.defaults[task];
    }
}

export const modelManager = new ModelManager();


async function runGemini<T>(apiCall: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const MAX_SERVER_RETRIES = 2;
  const totalKeyAttempts = (apiKeyManager['backupKeys']?.length ?? 0) + 1;

  for (let keyAttempt = 0; keyAttempt < totalKeyAttempts; keyAttempt++) {
    let serverRetryCount = 0;
    while (serverRetryCount <= MAX_SERVER_RETRIES) {
      try {
        const ai = apiKeyManager.getClient();
        return await apiCall(ai);
      } catch (error: any) {
        console.error(`Panggilan API gagal dengan indeks kunci ${apiKeyManager['currentKeyIndex']}:`, error);

        const errorMessage = (error?.error?.message || error?.message || '').toLowerCase();
        const errorCode = error?.error?.code;
        const errorStatus = error?.status;

        // Permanent errors that require key rotation
        const isPermanentQuotaError = errorCode === 429 && (errorMessage.includes('quota') || errorMessage.includes('limit'));
        const isApiKeyError = errorMessage.includes('api key') || errorCode === 400 || errorCode === 403 || isPermanentQuotaError;
        
        if (isApiKeyError) {
          console.log('Terdeteksi kesalahan kunci API atau kuota permanen. Memutar kunci...');
          break; // Break from the serverRetryCount loop to rotate key
        }
        
        // Temporary server-side errors that might resolve on retry
        const isTemporaryServerError = (errorCode === 503 || errorCode === 500 || errorStatus === 'UNAVAILABLE' || (errorCode === 429 && !isPermanentQuotaError));

        if (isTemporaryServerError) {
          serverRetryCount++;
          if (serverRetryCount > MAX_SERVER_RETRIES) {
            console.log(`Semua percobaan ulang server untuk kunci saat ini gagal.`);
            break; // Break to rotate key after max retries
          }
          const backoff = Math.pow(2, serverRetryCount) * 1000 + Math.random() * 500;
          console.log(`Server sibuk (${errorCode || errorStatus}), mencoba lagi dalam ${Math.round(backoff / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        } else {
          // Unhandled error, throw it
          throw error;
        }
      }
    }
    
    if (keyAttempt < totalKeyAttempts - 1) {
      apiKeyManager.rotateKey();
      console.log('Mencoba lagi dengan Kunci API berikutnya...');
    }
  }

  throw new Error('Semua Kunci API dan percobaan ulang gagal. Silakan periksa Kunci API Anda, tambahkan kunci cadangan di menu Pengaturan, atau coba lagi nanti.');
}


// For App.tsx

export const generateFashionOptions = async (productImage: UploadedImage, productName: string): Promise<FashionOptions> => {
    return runGemini(async (ai) => {
        const prompt = `You are a creative fashion director and professional stylist. Based on the provided product image and its name "${productName}", you must generate a list of creative and relevant options for a commercial photoshoot.
        
        Provide 3-4 options for each of the following categories:
        1.  **Model Style:** Describe the overall style and attitude of the model (e.g., 'Elegan & Mewah', 'Kasual & Santai', 'Sporty & Atletis').
        2.  **Background:** Describe the setting or background for the photoshoot (e.g., 'Studio Minimalis', 'Jalanan Kota (Urban)', 'Kafe Modern').
        3.  **Shot Type:** Describe the camera shot or composition (e.g., 'Seluruh Badan (Full Body)', 'Setengah Badan (Medium Shot)', 'Close-up pada Produk').
        
        The options must be highly relevant to the product and its likely target market. All options must be in Bahasa Indonesia.
        
        Respond ONLY with a valid JSON object in the specified format.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        modelStyles: { type: Type.ARRAY, items: { type: Type.STRING } },
                        backgrounds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        shotTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['modelStyles', 'backgrounds', 'shotTypes']
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};


export const fleshOutConcept = async (image: UploadedImage, productDescription: string, userConcept: string, count: number): Promise<string[]> => {
    return runGemini(async (ai) => {
        const prompt = `You are a world-class commercial photographer and creative director. A client has provided a product image, a description, and a simple creative concept. 
        
        - Product Description: "${productDescription}"
        - Client's Concept: "${userConcept}"

        Your task is to expand this simple concept into ${count} unique, detailed, and fantastic photoshoot briefs (prompts) for an image generation AI. Each prompt must be a masterpiece of creative direction. Be specific about the background, lighting, composition, mood, and potential props. Ensure the prompts are varied from each other.

        Respond ONLY with a JSON array of ${count} strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use a powerful model for creative expansion
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const jsonText = (response.text ?? '[]').trim();
        return JSON.parse(jsonText);
    });
};

export const analyzeProductContext = async (image: UploadedImage, style: PhotoStyle): Promise<Partial<ProductContext>> => {
    return runGemini(async (ai) => {
        let prompt = `You are a creative director. Analyze the provided product image. Respond ONLY in JSON format. `;
        const responseSchema: { type: Type, properties: any } = { type: Type.OBJECT, properties: {} };

        switch (style) {
            case PhotoStyle.Minimalis:
                prompt += `List 4 thematically relevant surfaces for minimalist photography (e.g., 'a clean slate slab', 'a rustic wooden plank').`;
                responseSchema.properties.relevantSurfaces = { type: Type.ARRAY, items: { type: Type.STRING } };
                break;
            case PhotoStyle.NaturalOrganik:
                prompt += `List 4 thematically relevant natural or organic surfaces/settings for photography (e.g., 'on a rustic wooden plank', 'among fresh herbs').`;
                responseSchema.properties.relevantSurfaces = { type: Type.ARRAY, items: { type: Type.STRING } };
                break;
            case PhotoStyle.Lifestyle:
                prompt += `List 4 thematically relevant lifestyle settings for lifestyle photography (e.g., 'on a mountaintop rock at sunrise', 'next to a campfire').`;
                responseSchema.properties.relevantSettings = { type: Type.ARRAY, items: { type: Type.STRING } };
                break;
            case PhotoStyle.Dinamis:
                prompt += `List 4 thematically relevant dynamic actions for dynamic photography (e.g., 'splashing through a muddy puddle', 'kicking up trail dust').`;
                responseSchema.properties.relevantActions = { type: Type.ARRAY, items: { type: Type.STRING } };
                break;
            default:
                return {}; // Return empty object if no context analysis is needed for the style
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        const jsonText = (response.text ?? '').trim();
        return JSON.parse(jsonText);
    });
};

export const getPromptRecommendations = async (image: UploadedImage, description: string, count: number): Promise<string[]> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: `Based on this product image and its description "${description}", generate ${count} creative and detailed photography prompts for a professional product photoshoot. The prompts should be varied and inspiring. Return them as a JSON array of strings.` }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING
                    }
                }
            }
        });
        // FIX: Add nullish coalescing to prevent calling trim on potentially undefined response.text
        const jsonText = (response.text ?? '').trim();
        const prompts = JSON.parse(jsonText);
        const result = Array(count).fill('');
        for (let i = 0; i < Math.min(prompts.length, count); i++) {
            result[i] = prompts[i];
        }
        return result;
    });
};

export const generateProductPhoto = async (productImage: UploadedImage, prompt: string, referenceImage?: UploadedImage | null): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        const parts: any[] = [
            { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
        ];

        if (referenceImage) {
            parts.push({ inlineData: { data: referenceImage.base64, mimeType: referenceImage.mimeType } });
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const responseParts = response?.candidates?.[0]?.content?.parts;
        if (!responseParts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan. Coba prompt yang berbeda.");
            }
            if (finishReason === 'NO_IMAGE') {
                throw new Error("AI tidak dapat menghasilkan gambar untuk permintaan ini. Ini bisa terjadi jika prompt terlalu kompleks atau gambar input tidak jelas. Coba sederhanakan prompt atau gunakan gambar lain.");
            }
            console.error("Invalid API response in generateProductPhoto:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }

        for (const part of responseParts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return { imageUrl };
            }
        }
        throw new Error("Tidak ada gambar yang dihasilkan oleh API.");
    });
};

export const generateShortProductDescription = async (productName: string): Promise<string> => {
     return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [{ text: `Dengan nama produk "${productName}", tulis deskripsi produk yang ringkas dan informatif dalam Bahasa Indonesia. JANGAN ulangi nama produk dalam deskripsi. Fokus pada fitur, bahan, atau kegunaan produk. Nada harus netral dan deskriptif, bukan seperti iklan. Mulai langsung dengan deskripsinya. Contoh: jika produknya adalah "Sepatu Lari", deskripsi yang baik adalah "Dirancang untuk kenyamanan maksimal saat berlari jarak jauh."` }]
            }
        });
        // FIX: Add nullish coalescing to prevent calling trim on potentially undefined response.text
        return (response.text ?? '').trim();
    });
};

// For BackgroundRemover.tsx
export const removeBackground = async (base64: string, mimeType: string, maskBase64: string | null): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        const parts: any[] = [
            { inlineData: { data: base64, mimeType } },
            { text: "Remove the background from this image. The output should be a PNG with a transparent background." }
        ];

        if (maskBase64) {
            parts.push({
                text: "Use the following mask as a guide. Green areas should be kept, and red areas should be removed."
            });
            parts.push({
                inlineData: { data: maskBase64, mimeType: 'image/png' }
            });
        }

        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const responseParts = response?.candidates?.[0]?.content?.parts;
        if (!responseParts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan.");
            }
            if (finishReason === 'NO_IMAGE') {
                throw new Error("AI tidak dapat memproses gambar ini. Coba gunakan gambar input yang berbeda.");
            }
            console.error("Invalid API response in removeBackground:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }

        for (const part of responseParts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return { imageUrl };
            }
        }
        throw new Error("Tidak ada gambar yang dihasilkan oleh API.");
    });
};

export const addShadow = async (base64: string, mimeType: string): Promise<{ imageUrl: string }> => {
     return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "This is an image with a transparent background. Add a realistic, soft drop shadow to the object. The output must be a PNG with a transparent background." }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const parts = response?.candidates?.[0]?.content?.parts;
        if (!parts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan.");
            }
            if (finishReason === 'NO_IMAGE') {
                throw new Error("AI tidak dapat menambahkan bayangan pada gambar ini. Coba gunakan gambar input yang berbeda.");
            }
            console.error("Invalid API response in addShadow:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }

        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return { imageUrl };
            }
        }
        throw new Error("Tidak ada gambar yang dihasilkan oleh API.");
    });
};

export const replaceBackground = async (base64: string, mimeType: string, prompt: string): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: `This is an image with a transparent background. Place the object on a new background described as: "${prompt}". The result should be photorealistic.` }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const parts = response?.candidates?.[0]?.content?.parts;
        if (!parts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan.");
            }
            if (finishReason === 'NO_IMAGE') {
                throw new Error("AI tidak dapat mengganti latar belakang untuk gambar ini. Coba prompt atau gambar input yang berbeda.");
            }
            console.error("Invalid API response in replaceBackground:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }

        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return { imageUrl };
            }
        }
        throw new Error("Tidak ada gambar yang dihasilkan oleh API.");
    });
};

// For StyloApp.tsx
export const identifyProduct = async (image: UploadedImage): Promise<string> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: 'Identify the main product in this image. Provide only the name of the product category and its primary characteristic (e.g., "Running shoes, red", "Handbag, leather, brown", "Wristwatch, silver"). Be concise.' }
                ]
            }
        });
        // FIX: Add nullish coalescing to prevent calling trim on potentially undefined response.text
        return (response.text ?? '').trim();
    });
};

export const estimateProductSize = async (productImage: UploadedImage): Promise<{ estimatedSize: string }> => {
    return runGemini(async (ai) => {
        const prompt = `Analyze the provided image and estimate the product's real-world size category. Choose ONE from: "Sangat Kecil (e.g., cincin, lipstik)", "Kecil (e.g., jam tangan, kacamata)", "Sedang (e.g., tas tangan, sepatu)", "Besar (e.g., ransel, jaket)", "Sangat Besar (e.g., koper, mantel panjang)".

        Respond ONLY in a valid JSON format with a single key "estimatedSize".`;
        
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        estimatedSize: { type: Type.STRING }
                    },
                    required: ['estimatedSize']
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};


// For AICopywriterPro.tsx
export const generateGroundedDescriptionFromImage = async (image: UploadedImage): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `You are an expert product marketer and analyst. Your task is to perform a two-step analysis of the provided product image and then generate a marketing description.

        Step 1: Identify the product. Analyze the image and identify the most specific product name possible (brand, model, type).

        Step 2: Research and Describe. Using the name you identified in Step 1, use Google Search to find its key features, materials, specifications, and unique selling points. Synthesize this information into a compelling and informative product description in Bahasa Indonesia, suitable for an e-commerce site.

        **Instructions:**
        - If you cannot find any information online after searching, generate a detailed description based *only* on what is visible in the product image.
        - Your final output must be ONLY the generated description in a single paragraph. Do not include the product name or any introductory phrases like "Berikut adalah deskripsinya:".
        - Keep the description concise, around 2-3 sentences.
        `;
        
        const response = await ai.models.generateContent({
           model: modelManager.getModel('text'),
           contents: {
               parts: [
                   { inlineData: { data: image.base64, mimeType: image.mimeType } },
                   { text: prompt }
               ]
           },
           config: {
             tools: [{googleSearch: {}}],
           },
        });
        
        return (response.text ?? '').trim();
    });
};


export const generateCopywriting = async (
  productImage: UploadedImage,
  contentType: string,
  tone: string,
  productDescription: string,
  targetAudience: string
): Promise<CopyResult> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are an expert copywriter and social media strategist. Your task is to generate marketing copy for a product based on the provided image and details.

        **Product Details:**
        - **Description:** ${productDescription || "Not provided. Analyze the image."}
        
        **Copywriting Requirements:**
        - **Content Type:** ${contentType}
        - **Tone of Voice:** ${tone}
        - **Target Audience:** ${targetAudience}
        
        **Your Task:**
        1.  Analyze the product image.
        2.  Based on all the information, write 3 unique and compelling copy variations.
        3.  Generate a list of 10 relevant and trending hashtags.
        
        **Instructions:**
        - The copy must be in Bahasa Indonesia.
        - The copy must be engaging and tailored to the specified content type, tone, and audience.
        - For 'Deskripsi Produk Shopify', provide a more detailed, structured description, possibly with bullet points using '*'.
        - For 'Subjek Email', the variations should be short, punchy, and attention-grabbing.
        
        Respond ONLY with a JSON object in the following format:
        {
          "copyVariations": ["variation 1", "variation 2", "variation 3"],
          "hashtags": ["hashtag1", "hashtag2", ...]
        }
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        copyVariations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        hashtags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};

export const refineCopywriting = async (
  productImage: UploadedImage,
  originalCopy: string,
  instruction: string
): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are a master copy editor. Your task is to refine a piece of marketing copy based on a specific instruction. You will also be given the product image for context.

        **Context:**
        - The copy is for the product shown in the image.

        **Original Copy:**
        """
        ${originalCopy}
        """

        **Instruction:**
        "${instruction}"

        **Your Task:**
        Rewrite the original copy to fulfill the instruction.
        - If the instruction is "Tambahkan emoji", creatively add relevant emojis.
        - If the instruction is "Buat lebih pendek", shorten it while keeping the core message.
        - If the instruction is "Ganti jadi lebih formal", rewrite it in a professional tone.
        - Adapt to any other custom instruction given.
        - The refined copy MUST be in Bahasa Indonesia.

        Respond ONLY with the final, refined text. Do not add any extra explanations or introductory phrases.
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            }
        });

        return (response.text ?? '').trim();
    });
};

// --- LP GENERATOR PRO ---
export const generateLandingPageScript = async (
    productImage: UploadedImage,
    productName: string,
    targetAudience: string,
    lpGoal: LpGoal,
    framework: LpFramework
): Promise<LpResult> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are a world-class conversion copywriter and marketing strategist. Your task is to generate a complete landing page script based on the provided product and strategic inputs.

        **STRATEGIC INPUTS:**
        - **Product Name:** "${productName}"
        - **Target Audience:** "${targetAudience}"
        - **Landing Page Goal:** "${lpGoal}"
        - **Chosen Copywriting Framework:** "${framework === 'AI-Recommended' ? 'You choose the best framework (AIDA or PAS) based on the inputs.' : framework}"

        **YOUR TASK:**
        Generate a script for a high-converting landing page, broken down into 8 sections.
        For each section, provide:
        - A unique \`id\` (hero, problem, solution, features, social_proof, offer, faq, final_cta).
        - A short, descriptive \`title\` (e.g., 'Hero Section', 'The Problem You Face').
        - The generated \`content\` for that section.
        - A \`pro_tip\` explaining the marketing psychology behind that section in one sentence.

        **RESPONSE FORMAT:**
        Respond ONLY with a valid JSON object. The root object should have two keys: "framework" (the framework you used, either "AIDA" or "PAS") and "script" (an array containing the 8 section objects as described above).
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        framework: { type: Type.STRING },
                        script: {
                            type: Type.ARRAY,
                            description: "An array of 8 landing page sections.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING, description: "The unique identifier for the section (e.g., 'hero', 'problem')." },
                                    title: { type: Type.STRING, description: "The title of the section." },
                                    content: { type: Type.STRING, description: "The generated copywriting for the section." },
                                    pro_tip: { type: Type.STRING, description: "A marketing tip explaining the section's purpose." }
                                },
                                required: ['id', 'title', 'content', 'pro_tip']
                            }
                        }
                    }
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.script || !Array.isArray(parsedResponse.script)) {
            throw new Error("Invalid script format received from API. Expected an array of sections.");
        }

        const scriptObject: LpScript = parsedResponse.script.reduce((acc: LpScript, section: LpSection) => {
            if (section.id) {
                acc[section.id] = section;
            }
            return acc;
        }, {});

        const finalResult: LpResult = {
            framework: parsedResponse.framework,
            script: scriptObject
        };

        return finalResult;
    });
};

export const regenerateLpSectionScript = async (
    productName: string,
    targetAudience: string,
    lpGoal: LpGoal,
    framework: LpFramework,
    sectionId: string,
    fullScript: any
): Promise<string> => {
     return runGemini(async (ai) => {
        const prompt = `
        You are a conversion copywriter tasked with regenerating a specific section of a landing page script.

        **CONTEXT:**
        - **Product Name:** "${productName}"
        - **Target Audience:** "${targetAudience}"
        - **Landing Page Goal:** "${lpGoal}"
        - **Framework:** "${framework}"
        - **Section to Regenerate:** "${sectionId}"
        - **Full Script (for context):** ${JSON.stringify(fullScript)}

        **YOUR TASK:**
        Rewrite ONLY the content for the "${sectionId}" section. Provide a new, fresh, and compelling variation. Do not add any extra explanations, JSON structure, or introductory phrases.
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ text: prompt }] }
        });
        return (response.text ?? '').trim();
    });
};

// --- ADDED MISSING FUNCTIONS ---

// For StyloApp
export const generatePoseIdeas = async (modelImage: UploadedImage, productDescription: string, count: number): Promise<string[]> => {
    return runGemini(async (ai) => {
        const prompt = `Based on the model's appearance in the first image and the product description "${productDescription}", generate ${count} creative, varied, and detailed pose descriptions for a fashion photoshoot. The poses should be suitable for showcasing the product. Respond ONLY with a JSON array of ${count} strings.`;
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const jsonText = (response.text ?? '[]').trim();
        return JSON.parse(jsonText);
    });
};

// New function for Smart Promotion Poses
export const generatePromoPoses = async (productImage: UploadedImage, productDescription: string, promoType: string, count: number): Promise<string[]> => {
    return runGemini(async (ai) => {
        const prompt = `
        Anda adalah seorang sutradara kreatif kelas dunia untuk kampanye pemasaran. Tugas Anda adalah menghasilkan ${count} deskripsi pose yang unik, kreatif, dan sangat efektif untuk pemotretan fashion, semuanya dalam Bahasa Indonesia.

        **TUJUAN FOTO:**
        Tujuan pemotretan ini adalah untuk mempromosikan: **"${promoType}"**.

        **INSTRUKSI KREATIF:**
        - Pose yang dihasilkan harus secara visual mengkomunikasikan esensi dari promosi ini.
        - **Contoh:** Untuk "Diskon Besar", pose harus energik, menarik perhatian, dan menunjukkan kegembiraan. Untuk "Edisi Terbatas", pose harus terlihat eksklusif, mewah, dan canggih.
        - Pose harus menampilkan produk secara alami: "${productDescription}".
        - Setiap deskripsi pose harus detail dan imajinatif, memberikan arahan yang jelas untuk seorang model.

        **FORMAT OUTPUT:**
        Hanya berikan respons dalam format array JSON yang berisi ${count} string. Jangan sertakan teks atau penjelasan lain.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const jsonText = (response.text ?? '[]').trim();
        return JSON.parse(jsonText);
    });
};


export const expandProductDescription = async (productDescription: string): Promise<{ description: string }> => {
    return runGemini(async (ai) => {
        const prompt = `Expand the following brief product name/description into a more detailed and appealing paragraph for a fashion photoshoot context. Product: "${productDescription}". Respond in JSON format with a "description" key.`;
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING }
                    }
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};

export const getAiPhotoshootRecommendations = async (
    productImage: UploadedImage,
    productDescription: string,
    productSize: string,
    poseCount: number,
    backgroundOptions: string[],
    moodOptions: string[],
    lightingOptions: string[],
    modelWearsHijab: boolean
): Promise<AiRecommendations> => {
    return runGemini(async (ai) => {
        const hijabInstruction = modelWearsHijab ? "The model is wearing a hijab, ensure the recommended outfit is modest and appropriate." : "";
        const prompt = `
        Act as a world-class fashion photoshoot creative director. Analyze the product image and its details. Your task is to provide a complete creative direction concept.

        **Product Details:**
        - Description: "${productDescription}"
        - Estimated Size: "${productSize}"
        ${hijabInstruction}

        **Your Tasks:**
        1.  **Generate Poses:** Create ${poseCount} unique and detailed pose descriptions that would best showcase this product.
        2.  **Recommend Outfit:** Suggest a suitable outfit for the model that complements the product.
        3.  **Recommend Background:** From the list [${backgroundOptions.join(', ')}], choose the most fitting background.
        4.  **Recommend Mood:** From the list [${moodOptions.join(', ')}], choose the most fitting mood.
        5.  **Recommend Lighting:** From the list [${lightingOptions.join(', ')}], choose the most fitting lighting style.

        Respond ONLY in a valid JSON format with the following structure:
        {
            "poses": ["pose 1", "pose 2", ...],
            "outfit": "A description of the outfit",
            "background": "Chosen background from the list",
            "mood": "Chosen mood from the list",
            "lighting": "Chosen lighting from the list"
        }`;
        
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        poses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        outfit: { type: Type.STRING },
                        background: { type: Type.STRING },
                        mood: { type: Type.STRING },
                        lighting: { type: Type.STRING }
                    }
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};

// For ProductVideoGenerator & StoryboardMaker
export const generateVideo = async (prompt: string, aspectRatio: string, image?: UploadedImage, useHighQuality?: boolean, modelOverride?: string): Promise<any> => {
    return runGemini(async (ai) => {
        const model = modelOverride || (useHighQuality ? modelManager.getModel('video_hq') : modelManager.getModel('video_fast'));
        const config: any = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio,
        };

        // The 'resolution' parameter is only supported by Veo 3.1 models.
        if (model.startsWith('veo-3.1')) {
            config.resolution = '720p';
        }

        const payload: any = {
            model,
            prompt,
            config
        };

        if (image && image.base64 && image.mimeType) {
            payload.image = {
                imageBytes: image.base64,
                mimeType: image.mimeType,
            };
        }

        let operation = await ai.models.generateVideos(payload);
        return operation;
    });
};

export const checkVideoStatus = async (operation: any): Promise<any> => {
    return runGemini(async (ai) => {
        let updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    });
};

export const getVideoActionIdeas = async (productImage: UploadedImage): Promise<string[]> => {
    return runGemini(async (ai) => {
        const prompt = `Based on this product image, generate 3 short, dynamic, and visually interesting actions the product could do in a video ad. Examples: "a splash of water", "levitating slightly", "a trail of smoke swirling". Respond ONLY with a JSON array of 3 strings.`;
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } }, { text: prompt }] },
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        const jsonText = (response.text ?? '[]').trim();
        return JSON.parse(jsonText);
    });
};

// For StoryboardMaker & AIAffiliator

export const analyzeProductWithInternet = async (productImage: UploadedImage): Promise<{ productName: string; productDescription: string }> => {
    return runGemini(async (ai) => {
        const prompt = `You are a world-class e-commerce specialist and product analyst. Your task is to perform a two-step analysis of the provided product image.

        Step 1: Deeply analyze the image to identify the product's full name, including brand and model if possible. Be very specific.

        Step 2: Using the identified product name from Step 1, perform a Google Search to find detailed information, key features, materials, specifications, and unique selling points.

        Step 3: Synthesize your findings into a valid JSON object with two keys: "productName" (a detailed product name/brand) and "productDescription" (a comprehensive but concise product description in Bahasa Indonesia, based on the information you found online).

        **CRITICAL:** Respond ONLY with the raw JSON object. Do not include any introductory text, markdown formatting ("\`\`\`json"), or explanations.`;
        
        const response = await ai.models.generateContent({
           model: modelManager.getModel('text'),
           contents: {
               parts: [
                   { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                   { text: prompt }
               ]
           },
           config: {
             tools: [{googleSearch: {}}],
           },
        });
        
        let jsonText = (response.text ?? '{}').trim();
        // Robust JSON parsing
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
             jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }

        try {
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("Gagal mengurai JSON dari respons yang didasarkan:", jsonText, e);
            throw new Error("AI mengembalikan format yang tidak valid. Coba lagi atau isi secara manual.");
        }
    });
};

export const suggestCreativeDirection = async (productDescription: string, audienceOptions: string[], vibeOptions: string[]): Promise<{ suggestedAudience: string; suggestedVibe: string }> => {
    return runGemini(async (ai) => {
        const prompt = `You are a marketing strategist. Based on the following product description, choose the BEST 'targetAudience' and 'vibe' from the provided lists.

        Product Description: "${productDescription}"

        Available Target Audiences: [${audienceOptions.join(', ')}]
        Available Vibes: [${vibeOptions.join(', ')}]

        Respond ONLY with a valid JSON object containing your two selections.`;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedAudience: { type: Type.STRING },
                        suggestedVibe: { type: Type.STRING }
                    },
                    required: ['suggestedAudience', 'suggestedVibe']
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        const result = JSON.parse(jsonText);

        // Validate that the AI returned a valid option from the lists
        const validAudience = audienceOptions.includes(result.suggestedAudience) ? result.suggestedAudience : audienceOptions[0];
        const validVibe = vibeOptions.includes(result.suggestedVibe) ? result.suggestedVibe : vibeOptions[0];
        
        return { suggestedAudience: validAudience, suggestedVibe: validVibe };
    });
};

// FIX: Added generateVoiceoverScript function for the new two-step workflow in AIAffiliator.
export const generateVoiceoverScript = async (
    productImage: UploadedImage,
    creativeDirection: CreativeDirection,
    creativeIdea?: string,
    modelImage?: UploadedImage,
): Promise<string> => {
    return runGemini(async (ai) => {
        let brief = `Iklan video berdurasi sekitar ${creativeDirection.duration} detik. Target audiens adalah ${creativeDirection.targetAudience}, dengan vibe ${creativeDirection.vibe} dan tipe konten ${creativeDirection.contentType}. Aspek rasio video adalah ${creativeDirection.aspectRatio}.`;
        
        if (creativeIdea && creativeIdea.trim()) {
            brief += ` \n**Ide Kreatif Pengguna:** Anda HARUS memasukkan ide ini ke dalam naskah: "${creativeIdea.trim()}"`;
        }

        const modelInstruction = modelImage
            ? "An image of a model is provided. The script should be written with a mix of product-focused narration and lines that could be spoken or demonstrated by the model."
            : "No model image is provided. The script should focus primarily on narrating the product's features and benefits.";

        const prompt = `You are an expert scriptwriter for short-form video ads. Based on the provided product image (and model image, if available) and the creative brief below, write a compelling and concise voiceover script.

        **Creative Brief:**
        ${brief}

        **Additional Instructions:**
        ${modelInstruction}
        - The script should be engaging and flow naturally.
        - The final output should be ONLY the script text, formatted for easy reading with line breaks separating scenes or ideas. Do not include scene numbers or visual descriptions (e.g., "SCENE 1:").
        - The language must be Bahasa Indonesia.
        `;

        const parts: any[] = [{ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } }];
        if (modelImage) {
            parts.push({ inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } });
        }
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts },
        });

        return (response.text ?? '').trim();
    });
};

// FIX: Added generateVisualsFromScript function for the new two-step workflow in AIAffiliator.
export const generateVisualsFromScript = async (
    script: string,
    productImage: UploadedImage,
    modelImage?: UploadedImage,
): Promise<AdGenResult> => {
    return runGemini(async (ai) => {
        const modelInstruction = modelImage
            ? "An image of a model IS provided. Create a storyboard with a good balance of 'product_shot' and 'model_shot' scenes. Ensure the model is the hero of several key scenes."
            : "No model image is provided. The storyboard should focus primarily on 'product_shot' scenes.";

        const prompt = `You are a creative director creating a visual storyboard from a finished script.

        **Final Voiceover Script:**
        """
        ${script}
        """

        **Your Task:**
        1. Break the script down into logical scenes. Each distinct paragraph or idea in the script should be a new scene.
        2. For each scene, write a compelling and detailed \`visual_description\`.
        3. Determine the \`scene_type\` for each scene ('product_shot' or 'model_shot').
        4. ${modelInstruction}

        **Response Format:**
        Respond ONLY with a valid JSON object with a single key "mainStoryboard", containing the original full script and an array of scene objects. Each scene object must have \`scene_number\`, \`scene_type\`, \`visual_description\`, and \`voiceover_script\` (the corresponding part of the original script).
        `;

        const parts: any[] = [{ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } }];
        if (modelImage) {
            parts.push({ inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } });
        }
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainStoryboard: {
                            type: Type.OBJECT,
                            properties: {
                                fullScript: { type: Type.STRING },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            scene_number: { type: Type.INTEGER },
                                            scene_type: { type: Type.STRING },
                                            visual_description: { type: Type.STRING },
                                            voiceover_script: { type: Type.STRING },
                                        },
                                        required: ['scene_number', 'scene_type', 'visual_description', 'voiceover_script']
                                    }
                                }
                            },
                            required: ['fullScript', 'scenes']
                        }
                    },
                    required: ['mainStoryboard']
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};

// Internal helper for script refinement
const refineScript = async (ai: GoogleGenAI, draftScenes: Scene[], contentType: string): Promise<Scene[]> => {
    let personaPrompt = '';
    switch (contentType) {
        case 'Storytelling':
            personaPrompt = "Anda adalah seorang Sutradara Film Pendek dan penulis naskah. Fokus pada narasi, koneksi emosional, dan alur cerita yang memikat. Gunakan bahasa yang evokatif dan deskriptif.";
            break;
        case 'Hardselling':
            personaPrompt = "Anda adalah seorang Ahli Iklan TV 'Direct Response'. Fokus pada urgensi, manfaat yang jelas, dan ajakan bertindak (CTA) yang kuat. Gunakan bahasa yang langsung, persuasif, dan energik.";
            break;
        case 'Softselling':
            personaPrompt = "Anda adalah seorang Influencer Lifestyle. Fokus pada menciptakan keinginan dan menunjukkan produk dalam konteks gaya hidup yang aspiratif. Gunakan bahasa percakapan yang otentik.";
            break;
        case 'Masalah/Solusi':
            personaPrompt = "Anda adalah seorang Penulis Naskah Iklan 'Problem/Solution'. Fokus pada menyoroti 'rasa sakit' (pain point) dan menyajikan produk sebagai jawaban yang sempurna.";
            break;
        case 'Unboxing':
            personaPrompt = "Anda adalah seorang Vlogger / Reviewer Produk yang antusias. Fokus pada menangkap kegembiraan saat membuka produk, menyoroti pengalaman sensorik (kemasan, tekstur).";
            break;
        default:
            personaPrompt = "Anda adalah seorang penulis naskah profesional. Buat naskah ini lebih mengalir dan alami.";
    }

    const prompt = `
    ${personaPrompt}

    Tugas Anda adalah menulis ulang HANYA bagian \`voiceover_script\` dari setiap adegan dalam larik JSON yang disediakan.
    Buat naskah yang kaku ini menjadi narasi yang mengalir, persuasif, dan sesuai dengan persona Anda, menghubungkan setiap adegan secara mulus.
    Pertahankan pesan inti dari setiap adegan tetapi sampaikan dengan cara yang jauh lebih elegan dan efektif.

    **PENTING: Setiap \`voiceover_script\` harus sangat singkat, idealnya antara 12 hingga 20 kata, agar pas dengan klip video pendek (5-8 detik). JANGAN melebihi batas kata ini.**
    
    Naskah Draf JSON Asli:
    ${JSON.stringify(draftScenes, null, 2)}

    HANYA kembalikan objek JSON dengan struktur yang sama persis (\`{ "scenes": [...] }\`), tetapi dengan nilai \`voiceover_script\` yang telah disempurnakan. Jangan mengubah properti lain.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Use a powerful model for creative refinement
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene_number: { type: Type.INTEGER },
                                scene_type: { type: Type.STRING },
                                visual_description: { type: Type.STRING },
                                voiceover_script: { type: Type.STRING },
                            },
                            required: ['scene_number', 'scene_type', 'visual_description', 'voiceover_script']
                        }
                    }
                },
                required: ['scenes']
            }
        }
    });

    const jsonText = (response.text ?? '{"scenes":[]}').trim();
    try {
        const parsed = JSON.parse(jsonText);
        // Basic validation to ensure we got a valid structure back
        if (Array.isArray(parsed.scenes) && parsed.scenes.length === draftScenes.length) {
             return parsed.scenes;
        }
    } catch(e) {
        console.error("Gagal mengurai naskah yang disempurnakan, kembali ke draf:", e);
    }
    return draftScenes; // Return original if parsing fails or structure is wrong
};


export const generateAdStoryboard = async (productImage: UploadedImage, creativeDirection: CreativeDirection, modelImage?: UploadedImage, creativeIdea?: string): Promise<AdGenResult> => {
    return runGemini(async (ai) => {
        // --- PASS 1: Generate Structural Draft ---
        let brief = `Iklan video berdurasi sekitar ${creativeDirection.duration} detik. Target audiens adalah ${creativeDirection.targetAudience}, dengan vibe ${creativeDirection.vibe} dan tipe konten ${creativeDirection.contentType}. Aspek rasio video adalah ${creativeDirection.aspectRatio}.`;

        if (creativeIdea && creativeIdea.trim()) {
            brief += ` \n**Ide Kreatif Pengguna:** Anda HARUS memasukkan ide ini ke dalam storyboard: "${creativeIdea.trim()}"`;
        }
        
        const modelInstruction = modelImage 
            ? "CRITICAL: A model image is provided. The storyboard MUST feature a good balance of 'product_shot' and 'model_shot' scenes. Aim for roughly half of the scenes to be 'model_shot'. Ensure the model is the hero of several key scenes, interacting with or showcasing the product."
            : "No model image provided. The storyboard should focus primarily on 'product_shot' scenes, but you can include conceptual shots if they make sense.";

        const draftPrompt = `You are a creative director creating a structural draft for a video ad. Based on the product image (and model image if provided) and the following brief, create a storyboard.
        
        Brief: "${brief}"
        
        ${modelInstruction}

        For each scene, provide a scene number, type ('product_shot' or 'model_shot'), a visual description, and a **direct, factual voiceover script line** that will be refined later.
        
        Respond ONLY with a JSON object with a single key "mainStoryboard".`;

        const parts: any[] = [
            { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
        ];
        if (modelImage) {
            parts.push({ inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } });
        }
        parts.push({ text: draftPrompt });

        const draftResponse = await ai.models.generateContent({
            model: modelManager.getModel('text'), // Fast model for drafting
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainStoryboard: {
                            type: Type.OBJECT,
                            properties: {
                                fullScript: { type: Type.STRING },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            scene_number: { type: Type.INTEGER },
                                            scene_type: { type: Type.STRING },
                                            visual_description: { type: Type.STRING },
                                            voiceover_script: { type: Type.STRING },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const draftJsonText = (draftResponse.text ?? '{}').trim();
        const draftResult = JSON.parse(draftJsonText) as AdGenResult;

        if (!draftResult.mainStoryboard || !draftResult.mainStoryboard.scenes || draftResult.mainStoryboard.scenes.length === 0) {
            return draftResult; // Return the draft if it's empty or invalid
        }

        // --- PASS 2: Refine the Script with a Persona ---
        const refinedScenes = await refineScript(ai, draftResult.mainStoryboard.scenes, creativeDirection.contentType);

        // Reconstruct the full script from the refined scenes
        const refinedFullScript = refinedScenes.map(scene => scene.voiceover_script).join('\n\n');

        return {
            mainStoryboard: {
                fullScript: refinedFullScript,
                scenes: refinedScenes,
            }
        };
    });
};

export const visualizeScene = async (prompt: string, productImage: UploadedImage, modelImage?: UploadedImage | null): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        const parts: any[] = [];
        
        // Prioritize model image if it exists for consistency
        if (modelImage && modelImage.base64 && modelImage.mimeType) {
            parts.push({ inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } });
        }
        parts.push({ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } });
        parts.push({ text: prompt });
        
        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const responseParts = response?.candidates?.[0]?.content?.parts;
        if (!responseParts) throw new Error("API response did not contain image parts.");
        for (const part of responseParts) {
            if (part.inlineData) {
                return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
        }
        throw new Error("No image generated.");
    });
};

export const generateCinematicVideoPrompt = async (visualDescription: string, sceneImage: UploadedImage): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `You are a world-class cinematic director. Based on the provided scene description and the final still image, write a single, detailed, and evocative prompt in ENGLISH for a text-to-video AI model like Google Veo or Flow.

        **Scene Description (for context):** "${visualDescription}"

        **Your Task:**
        - Analyze the still image provided.
        - Animate the scene by describing cinematic camera movements (e.g., "a slow dolly zoom", "a gentle pan from left to right", "an orbital shot around the product").
        - Add dynamic environmental effects (e.g., "subtle lens flare from the sun", "a gentle breeze causing the leaves to rustle", "soft particle effects glowing in the air").
        - Describe any subtle actions for the subject or product (e.g., "the model slowly turns their head towards the camera", "a drop of condensation rolls down the bottle").
        - The final prompt must be a single, coherent, and highly descriptive paragraph.
        - Respond ONLY with the prompt text itself. Do not add any extra explanations.
        - The prompt must be in ENGLISH to ensure compatibility with major video generation models.

        Example output: "A cinematic, photorealistic video. The camera starts with a close-up on the running shoe resting on a misty rock at sunrise, then slowly orbits around it, revealing the detailed texture of the fabric. A gentle lens flare from the sun sweeps across the frame as a light morning breeze rustles nearby leaves."
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: sceneImage.base64, mimeType: sceneImage.mimeType } },
                    { text: prompt }
                ]
            }
        });
        
        return (response.text ?? '').trim();
    });
};


// For StoryboardMaker
export const generateGroundedProductDescription = async (productName: string): Promise<string> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
           model: modelManager.getModel('text'),
           contents: `Who makes the product "${productName}" and what are its key features?`,
           config: {
             tools: [{googleSearch: {}}],
           },
        });
        return response.text ?? 'No description found.';
    });
};


// For AIVoiceoverStudio
export const generateVoiceover = async (script: string, actors: { name: string, voice: string }[], quality: 'standard' | 'pro'): Promise<string> => {
    return runGemini(async (ai) => {
        let finalScript = script;
        const config: any = {
            responseModalities: [Modality.AUDIO],
            speechConfig: {}
        };

        if (actors.length === 1) {
            // For single speaker, ensure the prompt format is clean and direct.
            // The API can infer speaker from the voiceConfig, no need for "Name: " prefix.
             config.speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: actors[0].voice } };
        } else {
            // Multi-speaker requires the "Name: Dialog" format in the script.
            config.speechConfig.multiSpeakerVoiceConfig = {
                speakerVoiceConfigs: actors.map(actor => ({
                    speaker: actor.name,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: actor.voice } }
                }))
            };
        }

        const response = await ai.models.generateContent({
            model: modelManager.getModel('tts'),
            contents: [{ parts: [{ text: finalScript }] }],
            config,
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("API tidak menghasilkan audio.");
        }
        return base64Audio;
    });
};

export const generateVoiceSample = async (voice: string): Promise<string> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('tts'),
            contents: [{ parts: [{ text: "Ini adalah contoh suara saya." }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
                }
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("API tidak menghasilkan sampel audio.");
        }
        return base64Audio;
    });
};

export const refineScriptWithEmotions = async (
    script: string, 
    creativeContext: { targetAudience: string, vibe: string, contentType: string }
): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `Anda adalah seorang Sutradara Suara AI ahli. Tugas Anda adalah menyempurnakan naskah yang diberikan agar terdengar lebih alami, menarik, dan selaras dengan konteks kreatif.

        **Tugas Anda:**
        1.  **Perbaiki Alur:** Tulis ulang bagian naskah secara halus untuk meningkatkan alur narasi antar baris dan aktor.
        2.  **Tambahkan Emosi:** Sisipkan tag emosi (misalnya, \`(ceria)\`, \`(sedih)\`, \`(berbisik)\`, \`(tegas)\`) secara cerdas di tempat yang paling berdampak. Pilihan emosi harus dipandu oleh konteks kreatif.
        3.  **Jaga Struktur:** Jangan ubah nama aktor (misalnya, \`Narator:\`). Pertahankan struktur asli dialog.

        **Konteks Kreatif:**
        - Target Audiens: ${creativeContext.targetAudience}
        - Vibe/Suasana: ${creativeContext.vibe}
        - Tipe Konten: ${creativeContext.contentType}

        **Naskah Asli:**
        """
        ${script}
        """

        **Output:**
        Hanya berikan respons berupa teks naskah lengkap yang telah disempurnakan. Jangan menambahkan penjelasan tambahan atau format markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }] },
        });
        return (response.text ?? '').trim();
    });
};


// For PosterCreator
export const generateCopyForPoster = async (productName: string): Promise<{ headline: string, bodyText: string, cta: string }> => {
    return runGemini(async (ai) => {
        const prompt = `Generate marketing copy for a poster for the product "${productName}". Provide a catchy headline, a short body text (1-2 sentences), and a call to action. Respond in JSON format with keys "headline", "bodyText", and "cta".`;
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING },
                        bodyText: { type: Type.STRING },
                        cta: { type: Type.STRING },
                    }
                }
            }
        });
        const jsonText = (response.text ?? '{}').trim();
        return JSON.parse(jsonText);
    });
};

export const generatePosterIdeas = async (productName: string, themes: string[], colors: string[], fonts: string[]): Promise<CreativeConcept[]> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are a senior graphic designer. For the product "${productName}", generate 3 distinct and creative poster concepts. 
        For each concept, provide a conceptName, conceptDescription, and choose a theme, colorPalette, and fontStyle strictly from the provided lists. 
        Also, generate a unique headline, bodyText, and cta for each concept.
        
        Available Themes: [${themes.join(', ')}]
        Available Color Palettes: [${colors.join(', ')}]
        Available Font Styles: [${fonts.join(', ')}]
        
        Respond ONLY with a JSON array of 3 objects.`;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            conceptName: { type: Type.STRING },
                            conceptDescription: { type: Type.STRING },
                            theme: { type: Type.STRING },
                            colorPalette: { type: Type.STRING },
                            fontStyle: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            bodyText: { type: Type.STRING },
                            cta: { type: Type.STRING },
                        }
                    }
                }
            }
        });
        const jsonText = (response.text ?? '[]').trim();
        return JSON.parse(jsonText);
    });
};

export const generatePoster = async (sourceImage: UploadedImage, config: PosterConfig, refinementInstruction?: string): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        let prompt = `
        You are an expert graphic design AI with a mastery of typography, composition, and marketing aesthetics. Your task is to create a complete, professional, and visually stunning commercial poster.

        **Core Task:**
        - Use the provided product image as the main subject.
        - Artistically render the specified text directly onto the poster. The text must be legible, well-integrated, and stylish.

        **Design Brief:**
        - **Product Name:** ${config.product_name}
        - **Theme/Style:** ${config.theme}
        - **Color Palette:** ${config.color_palette}
        - **Suggested Font Style:** Use "${config.font_style}" as inspiration for the typography.

        **Text to Render:**
        - **Headline:** "${config.headline}"
        - **Body Text:** "${config.body_text}"
        - **Call to Action (CTA):** "${config.cta}"

        **Instructions:**
        1.  Analyze the source product image.
        2.  Create a beautiful, cohesive design that incorporates the product and the text elements seamlessly.
        3.  The composition must be balanced and professional.
        4.  Ensure the typography is creative and matches the overall theme and font style suggestion.
        5.  The final image must be photorealistic, high-quality, and ready for commercial use. DO NOT just paste plain text on the image; integrate it into the design itself (e.g., using stylized containers, interesting layouts, etc.).
        `;

        if (refinementInstruction && refinementInstruction.trim() !== '') {
            prompt += `
            \n**CRITICAL REFINEMENT INSTRUCTION:** A previous version was generated. Now, you MUST apply this specific change while keeping the rest of the design consistent: "${refinementInstruction}". For example, if asked to make text bigger, only change the text size and layout, not the entire background.
            `;
        }


        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: {
                parts: [
                    { inlineData: { data: sourceImage.base64, mimeType: sourceImage.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });
        
        const parts = response?.candidates?.[0]?.content?.parts;
        if (!parts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan. Coba prompt atau teks yang berbeda.");
            }
            if (finishReason === 'NO_IMAGE' || finishReason === 'RECITATION') {
                 throw new Error("AI tidak dapat menghasilkan gambar untuk permintaan ini. Ini bisa terjadi jika teks terlalu panjang atau kompleks. Coba sederhanakan teks Anda.");
            }
            console.error("Invalid API response in generatePoster:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }
        for (const part of parts) {
            if (part.inlineData) {
                return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
        }
        throw new Error("No image generated.");
    });
};

// --- THIS IS THE REST OF THE FILE, UNCHANGED ---
// This part of the file is very long and contains functions for other apps.
// I will not include them here to keep the response focused, but they would be here in the full file.
// ... (rest of the functions for StyloApp, VideoGenerator, etc.) ...
export const generateStyloImage = async (prompt: string, modelImage: UploadedImage, productImage?: UploadedImage): Promise<{ imageUrl: string }> => {
    return runGemini(async (ai) => {
        const parts: any[] = [
            { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
            { text: prompt },
        ];
        if (productImage) {
            // Add product image as the very first part for better model attention
            parts.unshift({ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } });
        }

        const response = await ai.models.generateContent({
            model: modelManager.getModel('image'),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const responseParts = response?.candidates?.[0]?.content?.parts;
        if (!responseParts) {
            const finishReason = response?.candidates?.[0]?.finishReason;
             if (finishReason === 'SAFETY') {
                throw new Error("Gambar tidak dapat dibuat karena kebijakan keamanan. Coba prompt atau pose yang berbeda.");
            }
             if (finishReason === 'NO_IMAGE') {
                throw new Error("AI tidak dapat menghasilkan gambar untuk permintaan ini. Coba sederhanakan prompt atau gunakan gambar lain.");
            }
            console.error("Invalid API response in generateStyloImage:", JSON.stringify(response, null, 2));
            throw new Error("Respon API tidak valid dan tidak berisi gambar.");
        }

        for (const part of responseParts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return { imageUrl };
            }
        }
        throw new Error("Tidak ada gambar yang dihasilkan oleh API.");
    });
};

// For StyloPreviewModal - FIX for the main error
export const generateVideoPromptFromImage = async (base64: string, mimeType: string, guidance: string): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are a creative director specializing in short-form video content. Analyze the provided image, which is a still frame from a potential video.
        
        Your task is to write a detailed, cinematic video prompt for a text-to-video AI model (like Google Veo). The prompt should animate this still image into a short, dynamic video clip (around 3-5 seconds).

        - **Core Subject:** The main subject(s) in the image.
        - **User Guidance:** "${guidance || "Make it look cool and engaging."}"

        **Instructions:**
        - Describe the initial scene based on the image.
        - Describe the camera movement (e.g., slow zoom, dynamic pan, orbital shot).
        - Describe any character actions or movements.
        - Describe any environmental effects (e.g., wind blowing, leaves falling, lens flare).
        - The final prompt should be a single, coherent paragraph.
        - The tone should be evocative and descriptive.
        - Respond ONLY with the generated prompt text. Do not add any extra explanations.

        Example Output: "A photorealistic video of a woman in a stylish jacket standing in a modern cafe. The camera slowly pushes in on her as she takes a sip of coffee, a gentle lens flare catching the steam rising from the cup. The background has a soft, cinematic blur."
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });
        
        return (response.text ?? '').trim();
    });
};

export const generatePromotionalScript = async (productImage: UploadedImage, productDescription: string): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `
        You are an expert copywriter for short-form video ads. Your task is to write a short, persuasive promotional script for a model to say.

        **Context:**
        - The model will be showcasing the product seen in the provided image.
        - Product Description: "${productDescription}"
        
        **Requirements:**
        - The script must be very short, suitable for an 8-second video.
        - The tone must be persuasive, making the viewer desire the product.
        - The language must be Bahasa Indonesia.
        - Respond ONLY with the script text. Do not include labels like "Naskah:" or any other explanations.
        `;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
                    { text: prompt }
                ]
            }
        });
        
        return (response.text ?? '').trim();
    });
};


export const generateChatTitle = async (firstMessage: string): Promise<string> => {
    return runGemini(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: `Summarize the following user query into a short, concise chat title of no more than 5 words. Query: "${firstMessage}"`,
        });
        return response.text.replace(/["']/g, ''); // Remove quotes
    });
};

export const generateVideoConceptIdea = async (sceneImage: UploadedImage): Promise<string> => {
    return runGemini(async (ai) => {
        const prompt = `You are a creative director. Based on the provided image, write a short, one-sentence creative concept or guidance for animating it into a 3-5 second video. Focus on a single core idea, like camera movement, mood, or a subtle action. The output should be a simple string, not a full technical prompt.
        
        Example outputs:
        - "A slow, dramatic zoom-in on the product, with soft light particles floating in the air."
        - "A fast orbital shot around the model, capturing their energetic expression."
        - "The camera gently pans across the scene, with a subtle lens flare effect as it passes a light source."
        
        Respond only with the concept text in Bahasa Indonesia.`;

        const response = await ai.models.generateContent({
            model: modelManager.getModel('text'),
            contents: {
                parts: [
                    { inlineData: { data: sceneImage.base64, mimeType: sceneImage.mimeType } },
                    { text: prompt }
                ]
            }
        });
        
        return (response.text ?? '').trim();
    });
};
