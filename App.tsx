import React, { useState, useEffect } from 'react';
import { NavBar } from './NavBar';
import { ClothingItem, ViewState, WeatherData, OutfitRecommendation, Occasion } from './types';
import { analyzeClothingItem, getOutfitRecommendation, generateVirtualTryOn, getFashionTrends, getRealWeather } from './geminiService';

const DEFAULT_LOCATION = 'București';

const OCCASIONS: Occasion[] = [
  'Casual/Plimbare', 'Facultate', 'Job/Office', 'Date', 
  'Ieșire cu prietenii', 'Restaurant cu familia', 'Sport'
];

export default function App() {
  const [view, setView] = useState<ViewState>('wardrobe');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData>({ temp: 0, condition: '', location: DEFAULT_LOCATION });
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [trendPost, setTrendPost] = useState<string>('');
  
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('Casual/Plimbare');
  const [userBodyImage, setUserBodyImage] = useState<string | null>(null);
  const [generatedTryOnImage, setGeneratedTryOnImage] = useState<string | null>(null);
  const [tryOnItems, setTryOnItems] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('styleai-wardrobe');
    if (saved) setWardrobe(JSON.parse(saved));
    getFashionTrends().then(setTrendPost);
    fetchWeather(DEFAULT_LOCATION);
  }, []);

  useEffect(() => {
    localStorage.setItem('styleai-wardrobe', JSON.stringify(wardrobe));
  }, [wardrobe]);

  const fetchWeather = async (loc: string) => {
    setWeatherLoading(true);
    const data = await getRealWeather(loc);
    setWeather(data);
    setWeatherLoading(false);
  };

  const handleLocationChange = () => {
      const newLoc = prompt("Introdu orașul tău:", weather.location);
      if (newLoc && newLoc.trim() !== "") {
          setWeather(prev => ({ ...prev, location: newLoc, condition: '...' }));
          fetchWeather(newLoc);
      }
  };

  const handleAddItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const analysis = await analyzeClothingItem(base64);
          const newItem: ClothingItem = {
            id: Date.now().toString(),
            image: base64,
            category: analysis.category,
            description: analysis.description,
            isClean: true,
            createdAt: Date.now()
          };
          setWardrobe(prev => [newItem, ...prev]);
        } catch (error) {
          alert('Eroare la analiza imaginii.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteItem = (id: string) => {
    if (confirm("Ștergi acest articol?")) {
      setWardrobe(prev => prev.filter(item => item.id !== id));
    }
  };

  const toggleLaundry = (id: string) => {
    setWardrobe(prev => prev.map(item => item.id === id ? { ...item, isClean: !item.isClean } : item));
  };

  const handleGenerateOutfit = async () => {
    setLoading(true);
    const currentWeather = await getRealWeather(weather.location);
    setWeather(currentWeather);
    const rec = await getOutfitRecommendation(currentWeather, wardrobe, selectedOccasion);
    setOutfit(rec);
    setLoading(false);
  };

  const handleTryOnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => setUserBodyImage(ev.target?.result as string);
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const generateTryOn = async () => {
      if (!userBodyImage || tryOnItems.length === 0) {
          alert("Adaugă o poză cu tine și selectează haine!");
          return;
      }
      setLoading(true);
      try {
          const selectedClothes = wardrobe.filter(i => tryOnItems.includes(i.id));
          const resultImage = await generateVirtualTryOn(userBodyImage, selectedClothes);
          setGeneratedTryOnImage(resultImage);
      } catch (e) {
          alert("Eroare la generare. Încearcă din nou.");
      } finally {
          setLoading(false);
      }
  };

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col">
       <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4"></div>
       <p className="text-zinc-600 font-medium animate-pulse">Procesare AI...</p>
    </div>
  );

  const renderWardrobe = (isLaundryView: boolean) => {
    const items = wardrobe.filter(i => isLaundryView ? !i.isClean : i.isClean);
    const categories = Array.from(new Set(items.map(i => i.category)));

    return (
      <div className="pb-32 px-5 pt-8">
        <div className="flex justify-between items-end mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {isLaundryView ? 'Coș Rufe' : 'Garderobă'}
            </h1>
            <span className="text-zinc-400 text-sm font-medium">{items.length} articole</span>
        </div>
        {!isLaundryView && (
           <label className="flex items-center justify-center gap-3 bg-zinc-900 text-white p-4 rounded-2xl mb-8 shadow-xl shadow-zinc-200 active:scale-[0.98] transition-all cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleAddItem} />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              <span className="font-bold">Adaugă Articol Nou</span>
           </label>
        )}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-zinc-400 gap-4">
             <p>Niciun articol aici.</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="mb-8">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">{cat}</h2>
              <div className="grid grid-cols-2 gap-4">
                {items.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className="relative group bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-100/50">
                    <img src={item.image} alt={item.description} className="w-full aspect-[3/4] object-cover bg-zinc-50" />
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => toggleLaundry(item.id)} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md border border-white/20 transition-colors ${isLaundryView ? 'bg-green-500 text-white' : 'bg-white/90 text-zinc-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /></svg>
                         </button>
                         <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-sm backdrop-blur-md">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.1499.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149-.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                         </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderOutfit = () => (
    <div className="pb-32 px-5 pt-8 min-h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-zinc-900">Stylist</h1>
      <div onClick={handleLocationChange} className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl mb-8 active:scale-[0.99] transition-transform cursor-pointer">
        <div className="flex items-start justify-between">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-300">{weather.location}</span>
                </div>
                <div className="mt-2"><p className="text-4xl font-light">{weather.temp}°</p></div>
            </div>
            <div className="text-right">
                {weatherLoading ? <div className="animate-pulse w-8 h-8 bg-white/20 rounded-full"></div> : <p className="text-sm font-medium text-zinc-400 max-w-[100px] leading-tight">{weather.condition}</p>}
            </div>
        </div>
      </div>
      {!outfit && (
          <div className="flex-1 flex flex-col justify-center">
              <h3 className="font-bold text-lg mb-4 text-zinc-900">Ce planuri ai?</h3>
              <div className="flex flex-wrap gap-3 mb-10">
                  {OCCASIONS.map(occ => (
                      <button key={occ} onClick={() => setSelectedOccasion(occ)} className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${selectedOccasion === occ ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-zinc-200 text-zinc-600'}`}>{occ}</button>
                  ))}
              </div>
            <button onClick={handleGenerateOutfit} disabled={loading} className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 disabled:opacity-70">
                Generează Outfit
            </button>
          </div>
      )}
      {outfit && (
        <div className="animate-fade-in pb-10">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold leading-tight max-w-[70%]">{outfit.outfitName}</h2>
                <button onClick={() => setOutfit(null)} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200">X</button>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100"><p className="text-blue-900 text-sm leading-relaxed">{outfit.reasoning}</p></div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Articole Selectate</h3>
            <div className="grid grid-cols-2 gap-4">
                {wardrobe.filter(item => outfit.selectedItemIds.includes(item.id)).map(item => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden"><img src={item.image} className="w-full aspect-square object-cover" /></div>
                ))}
            </div>
        </div>
      )}
    </div>
  );

  const renderTryOn = () => (
      <div className="pb-32 px-5 pt-8">
          <h1 className="text-3xl font-bold mb-2 text-zinc-900">Probă Virtuală</h1>
          <p className="text-zinc-500 mb-8 text-sm leading-relaxed">Încarcă o poză cu tine, selectează hainele și lasă AI-ul să te îmbrace.</p>
          <div className="mb-8">
              {!userBodyImage ? (
                 <label className="block w-full aspect-[3/4] border-2 border-dashed border-zinc-300 rounded-3xl flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-colors">
                    <input type="file" onChange={handleTryOnUpload} className="hidden" />
                    <span className="font-medium text-zinc-500">Încarcă poza ta</span>
                 </label>
              ) : (
                  <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg">
                      <img src={userBodyImage} className="w-full h-full object-cover" />
                      <button onClick={() => setUserBodyImage(null)} className="absolute top-4 right-4 bg-white/90 text-zinc-900 p-2 rounded-full shadow-lg">X</button>
                  </div>
              )}
          </div>
          <h3 className="font-bold text-lg mb-4 text-zinc-900">Ce probăm azi?</h3>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-5 px-5">
              {wardrobe.filter(i => i.isClean).map(item => (
                  <div key={item.id} onClick={() => setTryOnItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} className={`flex-shrink-0 w-28 h-36 rounded-2xl overflow-hidden relative border-2 transition-all cursor-pointer shadow-sm ${tryOnItems.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}>
                      <img src={item.image} className="w-full h-full object-cover" />
                  </div>
              ))}
          </div>
          <button onClick={generateTryOn} disabled={loading || !userBodyImage || tryOnItems.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 mt-2 disabled:cursor-not-allowed">Generează Probă</button>
          {generatedTryOnImage && (
              <div className="mt-10 mb-8 animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-4">Rezultatul Tău</h3>
                  <img src={generatedTryOnImage} className="w-full rounded-3xl shadow-2xl border border-zinc-100" />
              </div>
          )}
      </div>
  );

  const renderTrends = () => (
      <div className="pb-32 px-5 pt-8">
          <h1 className="text-3xl font-bold mb-8 text-zinc-900">Trends</h1>
          <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-gradient-to-br from-zinc-800 to-black text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">S</div>
                 <div><p className="font-bold text-lg text-zinc-900">StyleAI Report</p><p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{new Date().toLocaleDateString()}</p></div>
             </div>
             <p className="text-zinc-600 leading-relaxed text-lg">{trendPost || "Se încarcă..."}</p>
          </div>
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-zinc-50">
      {loading && <LoadingOverlay />}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {view === 'wardrobe' && renderWardrobe(false)}
        {view === 'laundry' && renderWardrobe(true)}
        {view === 'outfit' && renderOutfit()}
        {view === 'tryon' && renderTryOn()}
        {view === 'trends' && renderTrends()}
      </div>
      <NavBar currentView={view} setView={setView} laundryCount={wardrobe.filter(i => !i.isClean).length} />
    </div>
  );
}