import { PainterTheme, Language, Agent } from './types';

export const PAINTER_THEMES: PainterTheme[] = [
  {
    id: 'davinci',
    name: 'Da Vinci',
    colors: {
      bg: '#E3DCD2', // Parchment
      text: '#3E3228', // Sepia ink
      accent: '#8B4513', // Saddle brown
      secondary: '#A0937D', // Muted earth
      panelBg: 'rgba(227, 220, 210, 0.7)',
      borderColor: '#8B4513',
      coral: '#CD5C5C',
      glass: 'rgba(139, 69, 19, 0.15)',
    },
  },
  {
    id: 'vangogh',
    name: 'Van Gogh',
    colors: {
      bg: '#1C3144', // Starry Night Blue
      text: '#FFD700', // Star Yellow
      accent: '#E6AF2E', // Vibrant Yellow
      secondary: '#3F88C5', // Light Blue
      panelBg: 'rgba(28, 49, 68, 0.7)',
      borderColor: '#E6AF2E',
      coral: '#FF6B6B',
      glass: 'rgba(230, 175, 46, 0.15)',
    },
  },
  {
    id: 'monet',
    name: 'Monet',
    colors: {
      bg: '#F0F8FF', // Alice Blue
      text: '#2F4F4F', // Dark Slate Gray
      accent: '#5F9EA0', // Cadet Blue
      secondary: '#ADD8E6', // Light Blue
      panelBg: 'rgba(240, 248, 255, 0.6)',
      borderColor: '#5F9EA0',
      coral: '#FA8072',
      glass: 'rgba(95, 158, 160, 0.15)',
    },
  },
  {
    id: 'picasso',
    name: 'Picasso',
    colors: {
      bg: '#F5F5F5',
      text: '#1A1A1A',
      accent: '#D32F2F', // Cubist Red
      secondary: '#E64A19', // Terracotta
      panelBg: 'rgba(255, 255, 255, 0.8)',
      borderColor: '#1A1A1A',
      coral: '#FF7043',
      glass: 'rgba(211, 47, 47, 0.15)',
    },
  },
  {
    id: 'kandinsky',
    name: 'Kandinsky',
    colors: {
      bg: '#FFFFFF',
      text: '#000000',
      accent: '#FF0000', // Primary Red
      secondary: '#0000FF', // Primary Blue
      panelBg: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#000000',
      coral: '#FF4081',
      glass: 'rgba(0, 0, 255, 0.1)',
    },
  },
  // Placeholder for the other 15 styles to reach 20, represented by variants
  { id: 'dali', name: 'Dalí', colors: { bg: '#C2B280', text: '#3E2723', accent: '#FF6F00', secondary: '#8D6E63', panelBg: 'rgba(194, 178, 128, 0.7)', borderColor: '#3E2723', coral: '#FFAB91', glass: 'rgba(255, 111, 0, 0.15)' } },
  { id: 'kahlo', name: 'Kahlo', colors: { bg: '#004D40', text: '#FFEB3B', accent: '#D81B60', secondary: '#8BC34A', panelBg: 'rgba(0, 77, 64, 0.7)', borderColor: '#D81B60', coral: '#FF5252', glass: 'rgba(216, 27, 96, 0.15)' } },
  { id: 'hokusai', name: 'Hokusai', colors: { bg: '#E0F7FA', text: '#01579B', accent: '#0277BD', secondary: '#B3E5FC', panelBg: 'rgba(224, 247, 250, 0.7)', borderColor: '#01579B', coral: '#FF8A65', glass: 'rgba(2, 119, 189, 0.15)' } },
  { id: 'basquiat', name: 'Basquiat', colors: { bg: '#212121', text: '#FFFFFF', accent: '#FFEB3B', secondary: '#00E676', panelBg: 'rgba(33, 33, 33, 0.8)', borderColor: '#FFFFFF', coral: '#FF5722', glass: 'rgba(255, 235, 59, 0.15)' } },
  { id: 'matisse', name: 'Matisse', colors: { bg: '#FFEBEE', text: '#B71C1C', accent: '#1E88E5', secondary: '#FFCDD2', panelBg: 'rgba(255, 235, 238, 0.7)', borderColor: '#1E88E5', coral: '#EF5350', glass: 'rgba(30, 136, 229, 0.15)' } },
  { id: 'rembrandt', name: 'Rembrandt', colors: { bg: '#261C15', text: '#D7C2AA', accent: '#C68E17', secondary: '#5D4037', panelBg: 'rgba(38, 28, 21, 0.8)', borderColor: '#C68E17', coral: '#A1887F', glass: 'rgba(198, 142, 23, 0.15)' } },
  { id: 'warhol', name: 'Warhol', colors: { bg: '#FF4081', text: '#FFFF00', accent: '#00BCD4', secondary: '#CDC0B0', panelBg: 'rgba(255, 64, 129, 0.2)', borderColor: '#FFFF00', coral: '#76FF03', glass: 'rgba(0, 188, 212, 0.15)' } },
  { id: 'okeeffe', name: 'O\'Keeffe', colors: { bg: '#FFF3E0', text: '#BF360C', accent: '#FF6F00', secondary: '#FFE0B2', panelBg: 'rgba(255, 243, 224, 0.7)', borderColor: '#BF360C', coral: '#FFCC80', glass: 'rgba(255, 111, 0, 0.15)' } },
  { id: 'pollock', name: 'Pollock', colors: { bg: '#ECEFF1', text: '#263238', accent: '#212121', secondary: '#CFD8DC', panelBg: 'rgba(236, 239, 241, 0.8)', borderColor: '#263238', coral: '#FF5722', glass: 'rgba(33, 33, 33, 0.1)' } },
  { id: 'magritte', name: 'Magritte', colors: { bg: '#B0BEC5', text: '#212121', accent: '#4CAF50', secondary: '#90A4AE', panelBg: 'rgba(176, 190, 197, 0.7)', borderColor: '#212121', coral: '#FF7043', glass: 'rgba(76, 175, 80, 0.15)' } },
  { id: 'cezanne', name: 'Cézanne', colors: { bg: '#E8F5E9', text: '#1B5E20', accent: '#FBC02D', secondary: '#C8E6C9', panelBg: 'rgba(232, 245, 233, 0.7)', borderColor: '#1B5E20', coral: '#FF8A65', glass: 'rgba(251, 192, 45, 0.15)' } },
  { id: 'renoir', name: 'Renoir', colors: { bg: '#FCE4EC', text: '#880E4F', accent: '#F06292', secondary: '#F8BBD0', panelBg: 'rgba(252, 228, 236, 0.7)', borderColor: '#F06292', coral: '#E57373', glass: 'rgba(240, 98, 146, 0.15)' } },
  { id: 'munch', name: 'Munch', colors: { bg: '#3E2723', text: '#FF9E80', accent: '#FF3D00', secondary: '#5D4037', panelBg: 'rgba(62, 39, 35, 0.8)', borderColor: '#FF3D00', coral: '#FFCCBC', glass: 'rgba(255, 61, 0, 0.15)' } },
  { id: 'klimt', name: 'Klimt', colors: { bg: '#4E342E', text: '#FFD700', accent: '#FFC107', secondary: '#D7CCC8', panelBg: 'rgba(78, 52, 46, 0.8)', borderColor: '#FFD700', coral: '#FFAB91', glass: 'rgba(255, 193, 7, 0.15)' } },
  { id: 'hopper', name: 'Hopper', colors: { bg: '#37474F', text: '#CFD8DC', accent: '#FFCA28', secondary: '#546E7A', panelBg: 'rgba(55, 71, 79, 0.8)', borderColor: '#FFCA28', coral: '#FF7043', glass: 'rgba(255, 202, 40, 0.15)' } },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  'en': {
    'title': 'Regulatory Command Center',
    'status.idle': 'Idle',
    'status.reasoning': 'Reasoning',
    'status.generating': 'Generating',
    'status.verifying': 'Verifying',
    'nav.distribution': 'Distribution Lab',
    'nav.documents': 'Document Factory',
    'nav.agents': 'Agent Manager',
    'btn.jackpot': 'Theme Jackpot',
    'label.model': 'Model',
    'label.upload': 'Upload Dataset',
    'label.analyze': 'Analyze Discrepancies',
    'chart.shipment': 'Shipment Volume',
    'chart.pareto': 'Pareto Power Wall',
    'chart.sankey': 'Network Flow',
    'chart.inconsistency': 'Gap Analysis',
  },
  'zh-TW': {
    'title': '監管指揮中心',
    'status.idle': '閒置',
    'status.reasoning': '推理中',
    'status.generating': '生成中',
    'status.verifying': '驗證中',
    'nav.distribution': '分銷數據實驗室',
    'nav.documents': '智能文檔工廠',
    'nav.agents': '代理管理器',
    'btn.jackpot': '主題大獎',
    'label.model': '模型',
    'label.upload': '上傳數據集',
    'label.analyze': '分析差異',
    'chart.shipment': '出貨量',
    'chart.pareto': '帕累托分析',
    'chart.sankey': '網絡流向',
    'chart.inconsistency': '缺口分析',
  }
};

export const DEFAULT_AGENTS: Agent[] = [
  { id: 'schema_validator', name: 'Schema Validator', description: 'Validates columns against canonical schema.', model: 'gemini-3-flash-preview' },
  { id: 'inconsistency_detect', name: 'Inconsistency Detector', description: 'Finds gaps between Supplier and Customer datasets.', model: 'gemini-3-pro-preview' },
  { id: 'risk_assessor', name: 'Risk Assessor', description: 'Analyzes regulatory risk in documentation.', model: 'gemini-3-pro-preview' },
];

export const AVAILABLE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash-lite-latest'
];