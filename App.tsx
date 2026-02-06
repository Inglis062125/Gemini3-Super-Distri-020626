import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, ScatterChart, Scatter, Cell, Treemap, ComposedChart, Area
} from 'recharts';
import { 
  Play, Upload, BarChart2, FileText, Settings, ShieldAlert, Dice5, Sun, Moon, Globe, 
  Database, Table, RefreshCw, Layers, Map as MapIcon, Activity, Filter, Search, 
  X, ChevronDown, ChevronUp, Clock, Tag
} from 'lucide-react';
import { PainterTheme, Language, DistributionRecord, ThemeMode, ChartDataPoint, FilterState } from './types';
import { PAINTER_THEMES, TRANSLATIONS, AVAILABLE_MODELS } from './constants';
import { createClient, generateSummary, analyzeDiscrepancies, standardizeDataset } from './services/geminiService';
import { defaultDataset } from './defaultData';

const defaultData = defaultDataset as DistributionRecord[];

// --- Helper Functions ---

const deriveTimeZone = (customerId: string): number => {
  // Simulation: Hash the numeric part of ID to get a GMT offset (-12 to 12)
  const nums = customerId.replace(/\D/g, '');
  if (!nums) return 0;
  return (parseInt(nums) % 25) - 12;
};

// --- Types & Interfaces ---

interface SankeyNode {
  name: string;
  category: 'Supplier' | 'License' | 'Model' | 'Customer';
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  supplierIds: [],
  categories: [],
  licenseNos: [],
  modelIds: [],
  lotQuery: '',
  serialQuery: '',
  customerIds: [],
  timeZoneRange: [-12, 12],
};

// --- Sub-components ---

const StatusStrip = ({ 
  connected, 
  status, 
  tokens, 
  lang 
}: { 
  connected: boolean; 
  status: string; 
  tokens: number; 
  lang: Language 
}) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="flex items-center space-x-4 text-xs font-mono py-1 px-4 border-b border-opacity-20 border-current bg-opacity-10 bg-black backdrop-blur-sm z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span>{connected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}</span>
      </div>
      <span className="opacity-50">|</span>
      <div className="uppercase tracking-wider">{t[`status.${status}`] || status}</div>
      <span className="opacity-50">|</span>
      <div>TOKENS: {tokens.toLocaleString()}</div>
    </div>
  );
};

const JackpotTheme = ({ onSelect }: { onSelect: (theme: PainterTheme) => void }) => {
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(() => {
    setSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const randomTheme = PAINTER_THEMES[Math.floor(Math.random() * PAINTER_THEMES.length)];
      onSelect(randomTheme);
      count++;
      if (count > 10) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 100);
  }, [onSelect]);

  return (
    <button 
      onClick={spin}
      disabled={spinning}
      className={`p-2 rounded-full hover:bg-white/20 transition-all ${spinning ? 'animate-spin' : ''}`}
      title="Theme Jackpot"
    >
      <Dice5 className="w-6 h-6" />
    </button>
  );
};

// --- Custom Inputs ---

const MultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange, 
  theme 
}: { 
  label: string, 
  options: string[], 
  selected: string[], 
  onChange: (val: string[]) => void, 
  theme: PainterTheme 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative group" ref={containerRef}>
      <label className="text-[10px] uppercase font-bold opacity-60 mb-1 block">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-2 text-xs border rounded cursor-pointer transition-all hover:bg-white/5"
        style={{ borderColor: theme.colors.borderColor, backgroundColor: theme.colors.glass }}
      >
        <div className="truncate flex-1">
          {selected.length === 0 ? <span className="opacity-50">All</span> : `${selected.length} selected`}
        </div>
        <ChevronDown size={12} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded shadow-xl border glass-panel"
             style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.borderColor }}>
           {options.map(opt => (
             <div 
               key={opt} 
               onClick={() => toggleOption(opt)}
               className="p-2 text-xs cursor-pointer hover:bg-black/5 flex items-center gap-2"
               style={{ color: selected.includes(opt) ? theme.colors.accent : theme.colors.text }}
             >
               <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${selected.includes(opt) ? 'bg-current' : ''}`}>
                 {selected.includes(opt) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
               </div>
               {opt}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

const TimeZoneSlider = ({ 
  range, 
  onChange, 
  theme 
}: { 
  range: [number, number], 
  onChange: (r: [number, number]) => void, 
  theme: PainterTheme 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
    const val = parseInt(e.target.value);
    const newRange = [...range] as [number, number];
    newRange[index] = val;
    // Simple clamp constraints
    if (index === 0 && val > range[1]) newRange[1] = val;
    if (index === 1 && val < range[0]) newRange[0] = val;
    onChange(newRange);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-[10px] font-mono opacity-70">
        <span>GMT {range[0] > 0 ? '+' : ''}{range[0]}</span>
        <span>GMT {range[1] > 0 ? '+' : ''}{range[1]}</span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track Background - Day/Night Gradient */}
        <div className="absolute w-full h-2 rounded-full overflow-hidden opacity-80"
             style={{ background: 'linear-gradient(90deg, #1a237e 0%, #ff9800 40%, #87ceeb 50%, #ff9800 60%, #1a237e 100%)' }}>
        </div>
        
        {/* Active Range Overlay */}
        <div 
          className="absolute h-2 rounded-full pointer-events-none"
          style={{ 
            left: `${((range[0] + 12) / 24) * 100}%`, 
            right: `${100 - ((range[1] + 12) / 24) * 100}%`,
            border: `1px solid ${theme.colors.text}`,
            backgroundColor: 'transparent'
          }}
        />

        {/* Thumbs - utilizing standard range inputs overlaid */}
        <input 
          type="range" min="-12" max="12" step="1"
          value={range[0]}
          onChange={(e) => handleChange(e, 0)}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        <input 
          type="range" min="-12" max="12" step="1"
          value={range[1]}
          onChange={(e) => handleChange(e, 1)}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />

        {/* Visual Thumbs (Since standard ones are hidden) */}
        <div className="absolute w-4 h-4 rounded-full border-2 shadow bg-white pointer-events-none transition-all"
             style={{ left: `calc(${((range[0] + 12) / 24) * 100}% - 8px)`, borderColor: theme.colors.accent }} />
        <div className="absolute w-4 h-4 rounded-full border-2 shadow bg-white pointer-events-none transition-all"
             style={{ left: `calc(${((range[1] + 12) / 24) * 100}% - 8px)`, borderColor: theme.colors.accent }} />
      </div>
    </div>
  );
};


// --- Filter Panel Component ---

const FilterPanel = ({ 
  data, 
  filters, 
  setFilters, 
  theme 
}: { 
  data: DistributionRecord[], 
  filters: FilterState, 
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
  theme: PainterTheme 
}) => {
  const [expanded, setExpanded] = useState(false);

  // Memoize options to avoid recalc on every render
  const options = useMemo(() => ({
    suppliers: Array.from(new Set(data.map(d => d.SupplierID))).sort(),
    categories: Array.from(new Set(data.map(d => d.Category))).sort(),
    licenses: Array.from(new Set(data.map(d => d.LicenseNo))).sort(),
    models: Array.from(new Set(data.map(d => d.Model))).sort(),
    customers: Array.from(new Set(data.map(d => d.CustomerID))).sort(),
  }), [data]);

  const activeFilterCount = 
    filters.supplierIds.length + 
    filters.categories.length + 
    filters.licenseNos.length + 
    filters.modelIds.length + 
    filters.customerIds.length +
    (filters.lotQuery ? 1 : 0) + 
    (filters.serialQuery ? 1 : 0) +
    (filters.timeZoneRange[0] !== -12 || filters.timeZoneRange[1] !== 12 ? 1 : 0);

  const clearAll = () => setFilters(INITIAL_FILTERS);

  return (
    <div className="flex flex-col gap-2 mb-4 glass-panel p-4 rounded-xl transition-all" 
         style={{ borderColor: theme.colors.borderColor, backgroundColor: theme.colors.panelBg }}>
       
       {/* Top Row: Search & Toggle */}
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 opacity-70">
            <Filter size={16} style={{ color: theme.colors.accent }} />
            <span className="font-bold text-sm">Query Deck</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" 
                    style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}>
                {activeFilterCount} Active
              </span>
            )}
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-40" size={14} />
            <input 
              type="text" 
              placeholder="Global Search (ID, Serial, Model...)" 
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-black/5 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none border border-transparent focus:border-opacity-50 transition-all"
              style={{ borderColor: theme.colors.accent }}
            />
          </div>

          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
          >
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
       </div>

       {/* Expanded Controls */}
       {expanded && (
         <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            
            {/* Column 1: Entities */}
            <div className="space-y-3">
               <MultiSelect 
                 label="Supplier ID" 
                 options={options.suppliers} 
                 selected={filters.supplierIds} 
                 onChange={(v) => setFilters(prev => ({ ...prev, supplierIds: v }))} 
                 theme={theme}
               />
               <MultiSelect 
                 label="Customer ID" 
                 options={options.customers} 
                 selected={filters.customerIds} 
                 onChange={(v) => setFilters(prev => ({ ...prev, customerIds: v }))} 
                 theme={theme}
               />
            </div>

             {/* Column 2: Product */}
            <div className="space-y-3">
               <MultiSelect 
                 label="Model SKU" 
                 options={options.models} 
                 selected={filters.modelIds} 
                 onChange={(v) => setFilters(prev => ({ ...prev, modelIds: v }))} 
                 theme={theme}
               />
               <MultiSelect 
                 label="License No" 
                 options={options.licenses} 
                 selected={filters.licenseNos} 
                 onChange={(v) => setFilters(prev => ({ ...prev, licenseNos: v }))} 
                 theme={theme}
               />
            </div>

            {/* Column 3: Specifics */}
            <div className="space-y-3">
               <div>
                 <label className="text-[10px] uppercase font-bold opacity-60 mb-1 block">Lot Number</label>
                 <div className="relative">
                   <Tag size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-40" />
                   <input 
                    type="text" 
                    placeholder="Includes..." 
                    value={filters.lotQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, lotQuery: e.target.value }))}
                    className="w-full p-2 pl-7 text-xs border rounded bg-transparent focus:outline-none"
                    style={{ borderColor: theme.colors.borderColor }}
                   />
                 </div>
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold opacity-60 mb-1 block">Serial Number</label>
                 <div className="relative">
                   <Tag size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-40" />
                   <input 
                    type="text" 
                    placeholder="Exact Match..." 
                    value={filters.serialQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, serialQuery: e.target.value }))}
                    className="w-full p-2 pl-7 text-xs border rounded bg-transparent focus:outline-none"
                    style={{ borderColor: theme.colors.borderColor }}
                   />
                 </div>
               </div>
            </div>

            {/* Column 4: Category & Time */}
            <div className="space-y-3">
               <div>
                  <label className="text-[10px] uppercase font-bold opacity-60 mb-1 flex items-center gap-2"><Clock size={10}/> Time Zone Range</label>
                  <TimeZoneSlider range={filters.timeZoneRange} onChange={(r) => setFilters(prev => ({ ...prev, timeZoneRange: r }))} theme={theme} />
               </div>
               <div>
                  <label className="text-[10px] uppercase font-bold opacity-60 mb-1 block">Category Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {options.categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          const isActive = filters.categories.includes(cat);
                          setFilters(prev => ({
                            ...prev,
                            categories: isActive ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat]
                          }));
                        }}
                        className={`text-[9px] px-2 py-1 rounded border transition-all truncate max-w-[100px] ${filters.categories.includes(cat) ? 'opacity-100 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                        style={{ 
                          borderColor: filters.categories.includes(cat) ? theme.colors.accent : theme.colors.borderColor,
                          backgroundColor: filters.categories.includes(cat) ? theme.colors.accent : 'transparent',
                          color: filters.categories.includes(cat) ? theme.colors.bg : theme.colors.text
                        }}
                        title={cat}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

         </div>
       )}
       
       {activeFilterCount > 0 && expanded && (
          <div className="mt-4 pt-4 border-t flex justify-end" style={{ borderColor: theme.colors.borderColor }}>
             <button 
               onClick={clearAll}
               className="text-xs flex items-center gap-1 hover:underline opacity-60 hover:opacity-100"
               style={{ color: theme.colors.coral }}
             >
               <X size={12} /> Clear All Filters
             </button>
          </div>
       )}
    </div>
  );
};

// --- Custom Visualization Components ---

// 1. Sankey Network Flow (Simulated using SVG)
const NetworkFlow = ({ data, theme }: { data: DistributionRecord[], theme: PainterTheme }) => {
  // Process data to find unique nodes at each level and links
  const suppliers = Array.from(new Set(data.map(d => d.SupplierID))).slice(0, 5);
  const licenses = Array.from(new Set(data.map(d => d.LicenseNo))).slice(0, 5);
  const models = Array.from(new Set(data.map(d => d.Model))).slice(0, 6);
  const customers = Array.from(new Set(data.map(d => d.CustomerID))).slice(0, 8);

  const columns = [suppliers, licenses, models, customers];
  const colLabels = ['Supplier', 'License', 'Model', 'Customer'];

  const nodeHeight = 30;
  const colWidth = 150;
  const svgHeight = 300;

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden">
      <svg width={colWidth * 4} height={svgHeight} className="mx-auto">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.colors.accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={theme.colors.secondary} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        
        {/* Draw Links */}
        {columns.slice(0, 3).map((col, colIdx) => {
          const nextCol = columns[colIdx + 1];
          return col.map((source, i) => {
            const sourceY = (i * (svgHeight / col.length)) + (svgHeight / col.length / 2);
            return nextCol.map((target, j) => {
               // Simple logic: if connected in data? For demo, we draw random curves to look "connected"
               const targetY = (j * (svgHeight / nextCol.length)) + (svgHeight / nextCol.length / 2);
               const path = `M ${(colIdx * colWidth) + 100} ${sourceY} C ${(colIdx * colWidth) + 150} ${sourceY}, ${(colIdx + 1) * colWidth - 50} ${targetY}, ${(colIdx + 1) * colWidth} ${targetY}`;
               return (
                 <path key={`${source}-${target}`} d={path} stroke="url(#linkGradient)" strokeWidth="2" fill="none" />
               );
            });
          });
        })}

        {/* Draw Nodes */}
        {columns.map((col, colIdx) => 
          col.map((node, rowIdx) => {
            const y = (rowIdx * (svgHeight / col.length)) + (svgHeight / col.length / 2) - (nodeHeight / 2);
            const x = colIdx * colWidth;
            return (
              <g key={node} transform={`translate(${x}, ${y})`}>
                <rect width={100} height={nodeHeight} rx={4} fill={colIdx % 2 === 0 ? theme.colors.accent : theme.colors.secondary} opacity={0.8} />
                <text x={50} y={20} textAnchor="middle" fontSize={10} fill={theme.colors.bg} fontWeight="bold">
                  {node.length > 12 ? node.substring(0, 10) + '..' : node}
                </text>
                {rowIdx === 0 && (
                   <text x={50} y={-10} textAnchor="middle" fontSize={12} fill={theme.colors.text} fontWeight="bold">
                     {colLabels[colIdx]}
                   </text>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  );
};

// 3. Mosaic Heatmap
const MosaicHeatmap = ({ data, theme }: { data: DistributionRecord[], theme: PainterTheme }) => {
  // Aggregate data: Customer vs Model
  const matrix: { x: string, y: string, z: number }[] = [];
  const map = new Map<string, number>();
  
  data.forEach(d => {
    const key = `${d.Model}|${d.CustomerID}`;
    map.set(key, (map.get(key) || 0) + 1);
  });

  Array.from(map.entries()).forEach(([key, val]) => {
    const [model, cust] = key.split('|');
    matrix.push({ x: model, y: cust, z: val });
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis type="category" dataKey="x" name="Model" stroke={theme.colors.text} fontSize={10} />
        <YAxis type="category" dataKey="y" name="Customer" stroke={theme.colors.text} fontSize={10} width={80} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: theme.colors.bg }} />
        <Scatter name="Volume" data={matrix} shape="square">
          {matrix.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.z > 2 ? theme.colors.coral : theme.colors.accent} opacity={entry.z / 5 + 0.2} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

// --- Mock Data Generator (Simplified for fallback) ---
const generateFallbackData = (count: number): DistributionRecord[] => {
  return Array.from({ length: count }).map((_, i) => ({
    SupplierID: i % 2 === 0 ? 'MedTech-A' : 'BioLife-B',
    Category: i % 3 === 0 ? 'Cardiac' : (i % 3 === 1 ? 'Ortho' : 'Dental'),
    LicenseNo: `LIC-${1000 + i}`,
    Model: `M-${200 + (i % 5)}`,
    LotNO: `L-${5000 + i}`,
    SerialNo: `SN-${Date.now()}-${i}`,
    CustomerID: `HOSP-${100 + (i % 4)}`,
    DeliverDate: new Date(2023, i % 12, (i % 28) + 1).toISOString().split('T')[0],
    Quantity: Math.floor(Math.random() * 50) + 1
  }));
};

// --- Main App Component ---

const App: React.FC = () => {
  // State
  const [theme, setTheme] = useState<PainterTheme>(PAINTER_THEMES[0]);
  const [mode, setMode] = useState<ThemeMode>('light');
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'distribution' | 'documents' | 'agents'>('distribution');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [agentStatus, setAgentStatus] = useState('idle');
  const [tokenCount, setTokenCount] = useState(1240);
  
  // Data Source State
  const [dataSource, setDataSource] = useState<'default' | 'custom'>('default');
  const [customInput, setCustomInput] = useState('');
  const [previewRows, setPreviewRows] = useState(20);

  // Data State
  const [dataA, setDataA] = useState<DistributionRecord[]>([]);
  const [dataB, setDataB] = useState<DistributionRecord[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Document State
  const [docSummary, setDocSummary] = useState('');
  
  const t = TRANSLATIONS[lang];
  const client = useMemo(() => createClient(apiKey), [apiKey]);

  // Derived Styles
  const themeStyles = useMemo(() => ({
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    fontFamily: activeTab === 'documents' ? 'Georgia, serif' : 'Inter, sans-serif',
  }), [theme, activeTab]);

  const panelStyle = {
    backgroundColor: theme.colors.panelBg,
    borderColor: theme.colors.borderColor,
    boxShadow: `0 8px 32px 0 ${theme.colors.glass}`,
  };

  const accentText = { color: theme.colors.accent };

  // Init Data - Load defaultData
  useEffect(() => {
    if (dataSource === 'default') {
        if (defaultData && defaultData.length > 0) {
            setDataA(defaultData);
            // Simulate a 'Customer' dataset (B) by slightly modifying (A)
            const simulatedB = defaultData.map((d, i) => {
                // Introduce slight random inconsistencies for demo
                if (i % 7 === 0) return { ...d, Quantity: d.Quantity + 1 };
                if (i % 11 === 0) return { ...d, DeliverDate: '2025-11-01' }; // shifted date
                return d;
            });
            setDataB(simulatedB);
        } else {
             // Fallback
             const fallback = generateFallbackData(20);
             setDataA(fallback);
             setDataB(fallback);
        }
    }
  }, [dataSource]);

  // --- Filtering Logic (Middleware) ---
  const filteredDataA = useMemo(() => {
    return dataA.filter(d => {
      // 1. Global Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = Object.values(d).some(val => String(val).toLowerCase().includes(q));
        if (!match) return false;
      }
      
      // 2. Exact Matches (Multi-Select)
      if (filters.supplierIds.length > 0 && !filters.supplierIds.includes(d.SupplierID)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(d.Category)) return false;
      if (filters.licenseNos.length > 0 && !filters.licenseNos.includes(d.LicenseNo)) return false;
      if (filters.modelIds.length > 0 && !filters.modelIds.includes(d.Model)) return false;
      if (filters.customerIds.length > 0 && !filters.customerIds.includes(d.CustomerID)) return false;

      // 3. Partial Matches (Text)
      if (filters.lotQuery && !d.LotNO.toLowerCase().includes(filters.lotQuery.toLowerCase())) return false;
      if (filters.serialQuery && !d.SerialNo.toLowerCase().includes(filters.serialQuery.toLowerCase())) return false;

      // 4. TimeZone
      const tz = deriveTimeZone(d.CustomerID);
      if (tz < filters.timeZoneRange[0] || tz > filters.timeZoneRange[1]) return false;

      return true;
    });
  }, [dataA, filters]);

  // We filter B similarly for comparison purposes (assuming similar structure)
  const filteredDataB = useMemo(() => {
     // Reuse logic or simplify. For discrepancies, we usually filter A and check B for corresponding.
     // For this demo, let's filter B with same rules to keep "views" consistent
     return dataB.filter(d => {
        if (filters.supplierIds.length > 0 && !filters.supplierIds.includes(d.SupplierID)) return false;
        if (filters.modelIds.length > 0 && !filters.modelIds.includes(d.Model)) return false;
        // ... etc
        return true;
     });
  }, [dataB, filters]);


  // Handlers
  const handleIngestData = async () => {
      if (dataSource === 'default') {
          // Re-trigger effect to reset
          const simulatedB = defaultData.map((d, i) => {
             if (i % 7 === 0) return { ...d, Quantity: d.Quantity + 1 };
             return d;
          });
          setDataA(defaultData);
          setDataB(simulatedB);
          return;
      }

      if (!customInput.trim()) return;

      setAgentStatus('generating');
      // Simple client-side check if JSON
      try {
          const parsed = JSON.parse(customInput);
          if (Array.isArray(parsed)) {
             setDataA(parsed); // Assuming user pasted valid JSON
             setAgentStatus('idle');
             return;
          }
      } catch (e) {
          // Not JSON, use Gemini to standardize
          const standardized = await standardizeDataset(customInput, 'gemini-3-flash-preview', client);
          if (standardized && standardized.length > 0) {
              setDataA(standardized);
              setTokenCount(prev => prev + 500);
          } else {
              alert("Could not standardize data. Please check format.");
          }
      }
      setAgentStatus('idle');
  };

  const handleAnalyze = async () => {
    setAgentStatus('reasoning');
    // Use FILTERED data for analysis to respect user context
    const result = await analyzeDiscrepancies(filteredDataA, filteredDataB, 'gemini-3-pro-preview', client);
    setAnalysisResult(result);
    setTokenCount(prev => prev + 450);
    setAgentStatus('idle');
  };

  const handleDocProcess = async () => {
    setAgentStatus('generating');
    setTimeout(async () => {
        const text = await generateSummary("Summarize this regulatory document about Class III recall.", 'gemini-2.5-flash-latest', client);
        setDocSummary(text);
        setTokenCount(prev => prev + 120);
        setAgentStatus('idle');
    }, 1500);
  };

  // --- Views ---

  const DistributionView = () => {
    // Prep chart data FROM FILTERED SOURCE
    const displayData = filteredDataA;
    const timelineData = displayData.slice(0, 30).map(d => ({ date: d.DeliverDate, quantity: d.Quantity }));
    
    // Pareto Data logic
    const modelCounts = new Map<string, number>();
    displayData.forEach(d => modelCounts.set(d.Model, (modelCounts.get(d.Model) || 0) + d.Quantity));
    const paretoData = Array.from(modelCounts.entries())
       .map(([name, value]) => ({ name, value }))
       .sort((a, b) => b.value - a.value);
    
    // Cumulative for Pareto Line
    let cum = 0;
    const totalQty = paretoData.reduce((acc, curr) => acc + curr.value, 0);
    const paretoDataWithLine = paretoData.map(d => {
        cum += d.value;
        return { ...d, cumPct: totalQty ? Math.round((cum / totalQty) * 100) : 0 };
    });

    // Treemap Data Logic
    const catMap = new Map<string, any>();
    displayData.forEach(d => {
        if(!catMap.has(d.Category)) catMap.set(d.Category, { name: d.Category, children: [] });
        const cat = catMap.get(d.Category);
        const existingChild = cat.children.find((c: any) => c.name === d.Model);
        if (existingChild) {
            existingChild.size += d.Quantity;
        } else {
            cat.children.push({ name: d.Model, size: d.Quantity });
        }
    });
    const treemapData = Array.from(catMap.values());

    // Geo/Timezone Logic (Simulated)
    const timezoneData = displayData.map((d, i) => ({
        x: deriveTimeZone(d.CustomerID),
        y: d.Quantity,
        z: d.Category
    }));

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top: Controls & Ingestion */}
        <div className="p-4 flex-shrink-0 grid grid-cols-12 gap-4">
             {/* Ingestion Panel */}
             <div className="col-span-12 lg:col-span-4 glass-panel p-4 rounded-xl flex flex-col gap-3" style={panelStyle}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2" style={accentText}><Database size={16}/> Data Source</h3>
                    <div className="flex bg-black/10 rounded p-1">
                        <button 
                            onClick={() => setDataSource('default')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${dataSource === 'default' ? 'bg-white/20 shadow' : 'opacity-50'}`}
                        >
                            Default
                        </button>
                        <button 
                            onClick={() => setDataSource('custom')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${dataSource === 'custom' ? 'bg-white/20 shadow' : 'opacity-50'}`}
                        >
                            Custom
                        </button>
                    </div>
                </div>

                {dataSource === 'custom' ? (
                    <div className="flex-1 flex flex-col gap-2">
                        <textarea 
                           className="flex-1 w-full bg-black/5 border rounded p-2 text-xs font-mono resize-none focus:outline-none focus:border-opacity-100"
                           style={{ borderColor: theme.colors.borderColor }}
                           placeholder="Paste CSV, JSON, or unstructured text here..."
                           value={customInput}
                           onChange={(e) => setCustomInput(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button className="flex-1 border border-dashed rounded flex items-center justify-center p-2 opacity-50 hover:opacity-100 text-xs">
                                <Upload size={14} className="mr-2"/> Upload File
                            </button>
                            <button 
                                onClick={handleIngestData}
                                className="flex-1 rounded font-bold text-xs flex items-center justify-center p-2 hover:brightness-110"
                                style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}
                            >
                                <RefreshCw size={14} className="mr-2"/> Transform & Load
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-sm opacity-60 italic border-2 border-dashed rounded" style={{ borderColor: theme.colors.borderColor }}>
                        Using System Default Dataset (Loaded from TS)
                    </div>
                )}
             </div>

             {/* Preview Panel - Shows FILTERED DATA */}
             <div className="col-span-12 lg:col-span-8 glass-panel p-4 rounded-xl flex flex-col" style={panelStyle}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold flex items-center gap-2" style={accentText}><Table size={16}/> Data Preview ({filteredDataA.length} records)</h3>
                    <div className="flex items-center gap-2 text-xs">
                        <span>Rows: {previewRows}</span>
                        <input 
                            type="range" min="5" max="50" 
                            value={previewRows} 
                            onChange={(e) => setPreviewRows(Number(e.target.value))}
                            className="w-24 accent-current"
                            style={{ color: theme.colors.accent }}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-auto rounded border border-opacity-10" style={{ borderColor: theme.colors.text }}>
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-black/5 sticky top-0 backdrop-blur-md">
                            <tr>
                                {['SupplierID', 'License', 'Model', 'Serial', 'Qty'].map(h => (
                                    <th key={h} className="p-2 font-semibold opacity-70 border-b" style={{ borderColor: theme.colors.borderColor }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDataA.slice(0, previewRows).map((row, idx) => (
                                <tr key={idx} className="border-b border-opacity-5 hover:bg-white/5 transition-colors" style={{ borderColor: theme.colors.text }}>
                                    <td className="p-2">{row.SupplierID}</td>
                                    <td className="p-2">{row.LicenseNo}</td>
                                    <td className="p-2 font-mono text-[10px]">{row.Model}</td>
                                    <td className="p-2 font-mono text-[10px] opacity-60">{row.SerialNo || '-'}</td>
                                    <td className="p-2">{row.Quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredDataA.length === 0 && <div className="p-4 text-center opacity-50">No records match filters.</div>}
                </div>
             </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4">
          <FilterPanel data={dataA} filters={filters} setFilters={setFilters} theme={theme} />
        </div>

        {/* Bottom: 6 Visualizations Grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
            <h3 className="text-xl font-bold mb-4 px-2" style={accentText}>Visualization Suite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                
                {/* 1. Sankey Network Flow */}
                <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><Activity size={14}/> Network Flow</h4>
                    <div className="flex-1 relative">
                        {displayData.length > 0 ? <NetworkFlow data={displayData} theme={theme} /> : <div className="text-center mt-20 opacity-50">No Data</div>}
                    </div>
                </div>

                {/* 2. Temporal Pulse Chart */}
                <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><Activity size={14}/> Temporal Pulse</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke={theme.colors.text} />
                        <XAxis dataKey="date" stroke={theme.colors.text} fontSize={10} tick={false} />
                        <YAxis stroke={theme.colors.text} fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.accent, fontSize: '12px' }} />
                        <Line 
                            type="monotone" 
                            dataKey="quantity" 
                            stroke={theme.colors.accent} 
                            strokeWidth={2} 
                            dot={{ r: 2 }} 
                            activeDot={{ r: 6, stroke: theme.colors.coral, strokeWidth: 2, className: 'animate-ping' }}
                        />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Customer-Model Heatmap */}
                <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                     <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><Layers size={14}/> Mosaic Heatmap</h4>
                     <div className="flex-1">
                        <MosaicHeatmap data={displayData} theme={theme} />
                     </div>
                </div>

                {/* 4. Treemap Landscape */}
                <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><Database size={14}/> Category Landscape</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap 
                            data={treemapData} 
                            dataKey="size" 
                            stroke="#fff" 
                            fill={theme.colors.secondary} 
                            aspectRatio={4/3}
                        >
                            <Tooltip contentStyle={{ backgroundColor: theme.colors.bg }}/>
                        </Treemap>
                    </ResponsiveContainer>
                </div>

                 {/* 5. Geospatial / Timezone (Simulated) */}
                 <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><MapIcon size={14}/> Timezone Distribution</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                             <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                             <XAxis type="number" dataKey="x" name="GMT Offset" unit="h" stroke={theme.colors.text} fontSize={10} domain={[-12, 12]}/>
                             <YAxis type="number" dataKey="y" name="Volume" stroke={theme.colors.text} fontSize={10} />
                             <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: theme.colors.bg }} />
                             <Scatter name="Locations" data={timezoneData} fill={theme.colors.coral} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* 6. Pareto Power Wall */}
                <div className="glass-panel p-4 rounded-xl border h-72 flex flex-col" style={panelStyle}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2 opacity-80"><BarChart2 size={14}/> Pareto Power Wall</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={paretoDataWithLine.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1}/>
                            <XAxis dataKey="name" stroke={theme.colors.text} fontSize={9} />
                            <YAxis yAxisId="left" stroke={theme.colors.text} fontSize={10}/>
                            <YAxis yAxisId="right" orientation="right" stroke={theme.colors.accent} fontSize={10} unit="%"/>
                            <Tooltip contentStyle={{ backgroundColor: theme.colors.bg }}/>
                            <Bar yAxisId="left" dataKey="value" fill={theme.colors.secondary} barSize={20} radius={[4,4,0,0]} />
                            <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={theme.colors.coral} strokeWidth={2} dot={false}/>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
      </div>
    );
  };

  const DocumentsView = () => (
    <div className="p-6 h-full flex flex-col">
       <div className="glass-panel p-8 rounded-xl border flex-1 flex gap-8" style={panelStyle}>
          {/* Left: Input */}
          <div className="w-1/3 flex flex-col gap-4 border-r border-opacity-20" style={{ borderColor: theme.colors.text }}>
            <h2 className="text-2xl font-bold" style={accentText}>Document Factory</h2>
            <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-black/5 transition-colors" style={{ borderColor: theme.colors.secondary }}>
                <Upload className="mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Drag PDF or Text here</p>
                <input type="file" className="hidden" />
            </div>
            
            <div className="mt-4">
                <label className="text-xs uppercase font-bold opacity-50">Select Agent</label>
                <select className="w-full mt-1 p-2 rounded bg-white/10 border" style={{ borderColor: theme.colors.borderColor }}>
                    <option>Risk Assessor</option>
                    <option>Summarizer</option>
                    <option>Keyword Extractor</option>
                </select>
            </div>

            <button 
                onClick={handleDocProcess}
                className="mt-auto py-3 rounded-lg font-bold shadow-lg"
                style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}
            >
                Start Processing
            </button>
          </div>

          {/* Right: Output */}
          <div className="w-2/3 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold opacity-80">Agent Output</h3>
                 <span className="text-xs px-2 py-1 rounded bg-black/10">Markdown View</span>
             </div>
             <div className="flex-1 rounded-lg p-4 overflow-y-auto font-serif leading-relaxed" style={{ backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)' }}>
                {docSummary ? (
                    <div dangerouslySetInnerHTML={{ __html: docSummary.replace(/\n/g, '<br/>') }} />
                ) : (
                    <div className="h-full flex items-center justify-center opacity-40 italic">
                        Processing output will appear here...
                    </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div 
      className={`min-h-screen transition-colors duration-700 ease-in-out overflow-hidden flex flex-col ${mode === 'dark' ? 'dark' : ''}`}
      style={themeStyles}
    >
        {/* CSS Variable Injection for dynamic Tailwind usage if needed, mostly doing inline styles for Painter themes */}
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-opacity-20 z-50 relative glass-panel" style={{ borderColor: theme.colors.borderColor }}>
           <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded bg-gradient-to-tr from-transparent to-white/30 flex items-center justify-center font-bold text-xl" style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}>
                   R
               </div>
               <h1 className="text-lg font-bold tracking-tight hidden md:block">{t.title}</h1>
           </div>

           <div className="flex items-center gap-4">
              <JackpotTheme onSelect={setTheme} />
              
              <button onClick={() => setLang(l => l === 'en' ? 'zh-TW' : 'en')} className="p-2 hover:bg-white/10 rounded-full">
                  <Globe size={20} />
              </button>

              <button onClick={() => setMode(m => m === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-white/10 rounded-full">
                  {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <div className="w-32">
                <input 
                  type="password" 
                  placeholder="API Key" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-black/10 rounded px-2 py-1 text-xs border border-transparent focus:border-current outline-none" 
                  disabled={!!process.env.API_KEY}
                />
              </div>
           </div>
        </header>

        <StatusStrip connected={!!client} status={agentStatus} tokens={tokenCount} lang={lang} />

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <nav className="w-64 flex flex-col border-r border-opacity-20 glass-panel" style={{ borderColor: theme.colors.borderColor }}>
                <div className="p-4 space-y-2">
                    {[
                        { id: 'distribution', icon: BarChart2, label: 'nav.distribution' },
                        { id: 'documents', icon: FileText, label: 'nav.documents' },
                        { id: 'agents', icon: Settings, label: 'nav.agents' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'shadow-lg scale-105' : 'hover:bg-white/5'}`}
                            style={activeTab === item.id ? { backgroundColor: theme.colors.secondary, color: '#fff' } : {}}
                        >
                            <item.icon size={18} />
                            <span className="font-medium text-sm">{t[item.label]}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-4 border-t border-opacity-10" style={{ borderColor: theme.colors.text }}>
                    <div className="text-xs opacity-60 uppercase mb-2">Model Config</div>
                    <select className="w-full bg-transparent border rounded p-1 text-xs mb-4 opacity-80" style={{ borderColor: theme.colors.borderColor }}>
                        {AVAILABLE_MODELS.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-transparent via-transparent to-black/5">
                {activeTab === 'distribution' && <DistributionView />}
                {activeTab === 'documents' && <DocumentsView />}
                {activeTab === 'agents' && (
                    <div className="flex items-center justify-center h-full opacity-50">
                        <div className="text-center">
                            <Settings size={48} className="mx-auto mb-4" />
                            <h2 className="text-xl">Agent Configuration</h2>
                            <p>Edit agents.yaml settings here.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};

export default App;
