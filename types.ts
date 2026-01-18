export enum Category {
  HEADWEAR = 'Cap (Șapcă/Fes)', TOPS = 'Tricouri/Topuri', HOODIES = 'Hanorace',
  JACKETS = 'Jachete', COATS = 'Geci/Paltoane', PANTS = 'Pantaloni',
  FOOTWEAR = 'Încălțăminte', ACCESSORIES = 'Accesorii'
}
export type Occasion = 'Facultate' | 'Date' | 'Ieșire cu prietenii' | 'Restaurant cu familia' | 'Job/Office' | 'Casual/Plimbare' | 'Sport';
export interface ClothingItem {
  id: string; image: string; category: Category; description: string; isClean: boolean; createdAt: number;
}
export interface WeatherData { temp: number; condition: string; location: string; }
export interface OutfitRecommendation { selectedItemIds: string[]; reasoning: string; outfitName: string; }
export type ViewState = 'wardrobe' | 'laundry' | 'outfit' | 'tryon' | 'trends';