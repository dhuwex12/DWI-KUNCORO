// types.ts

export enum PhotoStyle {
  Minimalis = 'Minimalis',
  Lifestyle = 'Lifestyle',
  Elegan = 'Elegan',
  Dinamis = 'Dinamis',
  Closeup = 'Closeup',
  NaturalOrganik = 'Natural & Organik',
  ReferenceBackground = 'Gaya Referensi Latar', // Ditambahkan
  ModeFashion = 'Mode Fashion',
  KonsepKustom = 'Konsep Kustom',
  Smart = 'Smart',
}

export interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ResultData {
  imageUrl: string;
  prompt: string;
  style: PhotoStyle;
  videoPrompt?: string;
  promoScript?: string;
}

export interface HistorySession {
  id: string;
  timestamp: number;
  originalImage: UploadedImage; // This will be a thumbnail
  results: ResultData[]; // These will be thumbnails
  productDescription: string;
  selectedStyle: PhotoStyle;
}

export interface CreativeDirection {
    targetAudience: string;
    vibe: string;
    lighting: string;
    contentType: string;
    duration?: number;
    aspectRatio?: string;
    outfit?: string;
}

export interface Scene {
    scene_number: number;
    scene_type: 'product_shot' | 'model_shot' | string;
    visual_description: string;
    voiceover_script: string;
}

export interface Storyboard {
    fullScript: string;
    scenes: Scene[];
}

export interface AdGenResult {
    mainStoryboard: Storyboard;
}

export interface FlowProductionPackage {
    scenes: {
        scene_number: number;
        prompt: string;
        start_image_path?: string;
    }[];
}

// FIX: Moved PosterConfig here to be globally accessible
export interface PosterConfig {
  product_name: string;
  theme: string;
  color_palette: string;
  font_style: string;
  headline: string;
  body_text: string;
  cta: string;
}

// FIX: Moved CreativeConcept here to be globally accessible
export interface CreativeConcept {
  conceptName: string;
  conceptDescription: string;
  theme: string;
  colorPalette: string;
  fontStyle: string;
  headline: string;
  bodyText: string;
  cta: string;
}

// FIX: Moved Actor interface here to be globally accessible
export interface Actor {
    id: string;
    name: string;
    voice: string;
}


// New interface for AI Copywriter Pro
export interface CopyResult {
  copyVariations: string[];
  hashtags: string[];
}

// New interface for Stylo App AI Recommendations
export interface AiRecommendations {
    poses: string[];
    outfit: string;
    background: string;
    mood: string;
    lighting: string;
}

// New interface for contextual analysis result
export interface ProductContext {
  productName?: string;
  useCase?: string;
  relevantSurfaces?: string[]; // For Minimalis & NaturalOrganik
  relevantSettings?: string[]; // For Lifestyle
  relevantActions?: string[];  // For Dinamis
}

// --- NEW TYPES FOR FASHION MODE ---
export const SMART_MIX_MODE = 'Mode Campuran Cerdas ✨';

export interface FashionOptions {
  modelStyles: string[];
  backgrounds: string[];
  shotTypes: string[];
}


// New interfaces for LP Generator Pro
export type LpGoal = 'Penjualan Langsung (Hard Sell)' | 'Mengumpulkan Prospek/Leads (Email/No. HP)' | 'Pendaftaran Webinar/Acara';
export type LpFramework = 'AIDA' | 'PAS' | 'AI-Recommended';

export interface LpSection {
    id: string; // e.g., 'hero', 'problem'
    title: string;
    content: string;
    pro_tip: string;
}

export interface LpScript {
    [key: string]: LpSection;
}

export interface LpResult {
    framework: LpFramework;
    script: LpScript;
}

// --- NEW TYPES FOR MARKETO CHAT APP ---
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface ChatSession {
    id: string;
    title: string;
    history: ChatMessage[];
    createdAt: number;
}


interface StyleDefinition {
  name: string;
  description: string;
  imageUrl: string;
  prompt?: string; // For simple styles like 'Smart'
  promptTemplate?: {
    template: string;
    modifiers: {
      [key: string]: string[];
    };
  };
}


export const STYLE_DEFINITIONS: Record<PhotoStyle, StyleDefinition> = {
  [PhotoStyle.Minimalis]: {
    name: 'Minimalis',
    description: 'Bersih, modern, dan fokus 100% pada produk.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Minimalist.png',
    promptTemplate: {
      template: 'Recreate the product in a minimalist aesthetic. This is a commercial product photograph [COMPOSITION] on [SURFACE]. The scene must be exceptionally clean. Use [LIGHTING]. Shadows must be very soft. The final image must be photorealistic and highly detailed.',
      modifiers: {
        COMPOSITION: [
          'in a centered composition',
          'following the rule of thirds',
          'in a top-down flat lay style',
          'placed in the lower third of the frame',
        ],
        SURFACE: [
          'a seamless white solid color background',
          'a light grey solid color background',
          'a white marble surface',
          'a smooth concrete pedestal',
        ],
        LIGHTING: [
          'with bright, even studio lighting from a large softbox',
          'with a single, soft light source from the side creating gentle shadows',
          'with bright, natural morning light from a window',
          'with clean, indirect ambient light',
        ],
      },
    },
  },
  [PhotoStyle.Lifestyle]: {
    name: 'Lifestyle',
    description: 'Hangat, nyata, dan relevan dengan kehidupan sehari-hari.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Lifestyle.png',
    promptTemplate: {
      template: 'Recreate the product in a lifestyle product photograph. Place the product in a [SETTING]. Use [LIGHTING] and include relevant, subtle props. The mood should be warm and authentic. The final image must be photorealistic, [CAMERA_STYLE].',
      modifiers: {
        SETTING: [
          'a modern minimalist bathroom setting',
          'a cozy wooden cafe table',
          'a stylish home office desk',
          'a sun-drenched kitchen counter with fresh ingredients',
          'a luxury hotel room setting with soft textiles',
          'an outdoor picnic setting on a sunny day',
        ],
        LIGHTING: [
          'from natural morning sun coming through a window',
          'from warm afternoon light, creating long shadows',
          'from soft, diffused indoor lighting for a cozy feel',
          'from golden hour sunlight for an aspirational mood',
        ],
        CAMERA_STYLE: [
          'as if shot on a DSLR with a 50mm f/1.8 lens creating a shallow depth of field',
          'as if shot with a slightly wider 35mm lens showing more of the environment',
          'with a cinematic feel and slightly muted, artistic colors',
          'with a clean, bright, and airy photography style',
        ],
      },
    },
  },
  [PhotoStyle.Elegan]: {
    name: 'Elegan',
    description: 'Mewah, premium, dan high-end.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Elegant.png',
    promptTemplate: {
        template: 'Recreate the product with an elegant, luxury aesthetic. This is a luxury product photograph. Place the product on a [SURFACE] with [LIGHTING] creating a [MOOD] mood. The composition should be artistic. The final image must be photorealistic and high-end.',
        modifiers: {
            SURFACE: [
                'dark, textured black slate surface',
                'draped dark silk fabric',
                'a reflective black glass surface with faint reflections',
                'a pedestal made of dark, rich wood',
                'a bed of crushed velvet',
            ],
            LIGHTING: [
                'dramatic side lighting from a single key light to emphasize texture',
                'low-key lighting with high contrast and deep, strong shadows',
                'a soft spotlight focused only on the product against a dark background',
                'backlighting to create a glowing silhouette or rim light around the product',
            ],
            MOOD: [
                'luxurious and premium',
                'mysterious and sophisticated',
                'bold and dramatic',
                'classic and timeless',
            ],
        },
    },
  },
  [PhotoStyle.Dinamis]: {
    name: 'Dinamis',
    description: 'Penuh energi, gerakan, dan cocok untuk media sosial.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Dynamic.png',
    promptTemplate: {
        template: `Recreate the product in a dynamic and energetic commercial photograph. The scene should feature [ACTION]. Use [LIGHTING] and a [COMPOSITION]. The final image must be photorealistic, modern, and eye-catching.`,
        modifiers: {
            ACTION: [
                'a splash of clear water frozen in time around the product',
                'a cloud of fine, colored powder exploding around it',
                'a trail of elegant smoke swirling past it',
                'a motion blur effect as if the product is moving at high speed',
                'levitating slightly off the ground with a subtle glow beneath it',
            ],
            LIGHTING: [
                'bold, vibrant, high-contrast lighting',
                'dramatic studio strobes that freeze the action perfectly',
                'colorful gel lighting (e.g., blue and pink) for a modern, edgy look',
                'strong, hard light to create defined, sharp shadows',
            ],
            COMPOSITION: [
                'an exciting off-center composition',
                'a dynamic low-angle shot making the product look heroic',
                'a dutch-angle (tilted) composition to create tension and energy',
                'a composition that uses leading lines to draw the eye to the product in motion',
            ],
        },
    },
  },
  [PhotoStyle.Closeup]: {
    name: 'Closeup',
    description: 'Detail tajam, fokus pada fitur terbaik produk.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Closeup.png',
    promptTemplate: {
        template: `Recreate the product as a detailed closeup or macro commercial photograph from a [CAMERA_ANGLE], focusing on [DETAIL]. Use [LIGHTING] to emphasize texture and form. The composition must be tightly framed on the product detail, with a shallow depth of field. The final image must be professional, photorealistic and highly detailed.`,
        modifiers: {
            CAMERA_ANGLE: [
                'a unique and interesting extreme low-angle',
                'a clean top-down flat lay angle',
                'a classic 45-degree angle',
                'an extreme macro shot angle, almost abstract',
            ],
            DETAIL: [
                'a key feature or button of the product',
                'its unique surface texture (e.g., leather grain, brushed metal)',
                "the product's logo or brand name",
                'the stitching, weave, or a specific material detail',
            ],
            LIGHTING: [
                'bright, clean, even studio lighting',
                'a single, focused light source to create raking light that emphasizes texture',
                'soft, diffused natural light to gently show form and material',
                'a ring light to create a clean, modern look with no shadows',
            ],
        },
    },
  },
  [PhotoStyle.NaturalOrganik]: {
    name: 'Natural & Organik',
    description: 'Membumi, otentik, dan menenangkan.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Natural.png',
    promptTemplate: {
      template: 'Recreate the product in an authentic, natural, and organic photoshoot. The product is arranged [COMPOSITION] on [PERMUKAAN_ALAMI]. The scene is bathed in [CAHAYA_LEMBUT] and includes [PROPERTI_PENDUKUNG]. The overall mood is [MOOD]. The final image must be photorealistic, with rich textures and an earthy color palette.',
      modifiers: {
        COMPOSITION: [
          'in a minimalist flat lay composition', 
          'centered with ample negative space', 
          'in a beautifully messy arrangement',
          'partially hidden by a natural element like a leaf',
        ],
        PERMUKAAN_ALAMI: [
          'a slab of unpolished teak wood',
          'a dark grey slate stone slab',
          'a bed of soft green moss',
          'a slightly wrinkled beige linen cloth',
          'a smooth, light-colored river stone',
          'a rustic terracotta tile',
        ],
        CAHAYA_LEMBUT: [
          'soft morning sunlight coming from a window',
          'dappled sunlight filtering through leaves',
          'the golden light of golden hour, just before sunset',
          'the soft, even light of an overcast day',
        ],
        PROPERTI_PENDUKUNG: [
          'with a few fresh water droplets on the product and surface',
          'next to a sprig of dried lavender',
          'surrounded by relevant raw ingredients (like coffee beans or citrus slices)',
          'with a soft shadow of a palm leaf in the foreground',
          'half-submerged in calm, clear water',
          'with no props, just focusing on texture and light',
        ],
        MOOD: [
            'calm and serene', 
            'fresh and invigorating', 
            'warm and earthy', 
            'pure and clean'
        ],
      },
    },
  },
    [PhotoStyle.ReferenceBackground]: {
    name: 'Referensi Latar',
    description: 'Gunakan gambar lain sebagai referensi latar belakang & gaya.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Reference.png',
  },
  [PhotoStyle.ModeFashion]: {
    name: 'Mode Fashion',
    description: 'Ciptakan foto komersial dengan model AI.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Fashion.png',
  },
  [PhotoStyle.KonsepKustom]: {
    name: 'Konsep Kustom',
    description: 'Jelaskan idemu, biarkan AI menjadi sutradara kreatifmu.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Custom.png',
  },
  [PhotoStyle.Smart]: {
    name: 'Smart',
    description: 'AI akan membuatkan prompt kreatif untuk Anda edit.',
    imageUrl: 'https://storage.googleapis.com/aistudio-marketplace-public-assets/presets/photographer/Smart.png',
    prompt: '', // This style remains manual, so no template.
  },
};