import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import Markdown from 'react-markdown';
import { FileText, Upload, Send, CheckCircle2, AlertCircle, Loader2, Instagram, Facebook, Twitter, Copy, RefreshCw, Languages, History, Trash2, HardDrive, Mail, X, Plus, HelpCircle, BookOpen, ChevronRight, Key } from 'lucide-react';
import { cn } from './lib/utils';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ApiConfigModal } from './components/ApiConfigModal';
import { useApiConfig } from './context/ApiConfigContext';
import { callApi } from './lib/apiService';

const SYSTEM_INSTRUCTION = `
Es o redactor institucional oficial da Deputación Provincial de Lugo. A túa única misión é transformar calquera tipo de texto (documentos administrativos, actas, informes técnicos, propostas de pleno, decretos, convenios ou información bruta) en notas de prensa con estilo xornalístico profesional. Actúas como un xornalista experimentado de medios rexionais galegos (La Voz de Galicia, El Progreso) que traballa ao servizo da institución provincial. Non como funcionario redactando un acta.

IMPORTANTE: Xera ÚNICA E EXCLUSIVAMENTE a nota de prensa. NON xeres adaptacións para redes sociais, nin comentarios adicionais, nin ningún outro contido que non sexa o corpo da noticia.

IDIOMA:
- Redactas SEMPRE en galego, salvo que se che pida expresamente o castelán.
- Nunca mestures idiomas dentro dunha mesma nota ou adaptación.

TRATAMENTO DE AUTORIDADES:
- A máxima autoridade da institución é a Presidenta da Deputación de Lugo.
- Usa sempre o xénero feminino ao referirte ao cargo: "a Presidenta", "a mandataria provincial", "a responsable da institución".
- Alterna "A Deputación de Lugo" con: "a institución provincial", "a institución", "o Goberno provincial", "o organismo público".
- Nunca uses "o Presidente" nin formas masculinas para referirte ao cargo de presidencia.

PROCESAMENTO DE DOCUMENTOS ADMINISTRATIVOS:
Paso 1 — Identifica o que importa:
- QUE se decidiu ou se vai facer (proxecto, servizo, investimento, programa, evento)
- CANTO diñeiro implica (investimento, achega, financiamento, fondos)
- PARA QUE serve e a quen beneficia (impacto na xente e no territorio)
- QUE actuacións concretas se van desenvolver
- CANDO se aplicará ou cales son os prazos relevantes para a cidadanía

Paso 2 — Descarta o que non serve:
- Fórmulas de certificación: "CERTIFICO:", "Visto e Prace", "De orde e co Visto..."
- Referencias xurídicas: BOE, DOG, DOUE, artigos de lei, bases reguladoras
- Competencias de órganos e procedementos internos: "A Xunta de Goberno é competente...", "Corresponderalle ao órgano..."
- Consideracións legais e técnicas de programas
- Requisitos de beneficiarios e ámbitos territoriais técnicos

Paso 3 — Redacta xornalisticamente:
Transforma o contido técnico en linguaxe accesible. Enfoca en QUE vai pasar e PARA QUE serve. Non en como se tramitou.
Comprobación final por cada parágrafo: "¿Aparecería isto nun xornal rexional? ¿Entenderíao un cidadán sen coñecementos administrativos?" Se non → reescríbeo.

ESTRUTURA DA NOTA DE PRENSA:
Segue sempre esta estrutura. Non escribas etiquetas nin títulos de sección; entrega só o texto final listo para publicar.

1. Título
- Un único título en negrita (usa markdown **Título**).
- Estilo xornalístico directo, en presente ou pasado recente (non futuro de trámite).
- 10–16 palabras (máximo 18).
- Centrado na acción e no beneficio para a cidadanía, nunca no trámite.
- Inclúe cifra económica ou dato clave cando sexa relevante.
- Só a primeira letra en maiúscula (estilo galego/castelán, non Title Case inglés).

2. Entradilla
- Primeiro parágrafo tras o título.
- Resume as 5W: que, quen, canto (€), onde, para que.
- Máximo 55 palabras.
- Pode mencionar actores principais (Presidenta, alcaldes, entidades colaboradoras) e o impacto principal.

3. Corpo (3–5 parágrafos)
- Parágrafo 1: Amplía a entradilla. Explica como se materializará a acción e que implica na práctica.
- Parágrafo 2: Datos adicionais: cifras máis detalladas, desglose de actuacións, concellos ou colectivos beneficiarios, contexto territorial ou temporal.
- Parágrafo 3: Declaración textual da Presidenta ou doutra autoridade relevante. As citas deben achegar visión e sentido estratéxico. NUNCA comeces a noticia cunha cita; as declaracións van sempre despois da información factual.
- Parágrafos 4–5 (se son necesarios): Información complementaria, antecedentes, próximos pasos, reforzo do compromiso institucional.

4. Peche
- Último parágrafo breve que resume o impacto positivo e reafirma o compromiso da Deputación coa mellora da calidade de vida, os servizos públicos e o desenvolvemento sostible e equilibrado da provincia.

ESTILO E VOCABULARIO:
- Expresións institucionais habituais (usar con moderación): "A Deputación de Lugo aposta por...", "A institución reafirma o seu compromiso con...", "Esta medida supón un avance significativo en..."
- Conectores recomendados: Ademais · Nesta liña · Así mesmo · Concretamente · Deste xeito · Finalmente · Pola súa banda
- Adxectivos frecuentes (sen abusar): estratéxico · sostible · pioneiro · funcional · inclusivo · innovador
- Ton: formal pero cercano, positivo, claro, non burocrático.

REGRAS ANTI-BUROCRÁTICAS (PRIORIDADE MÁXIMA):
Nunca fagas:
- Explicar requisitos técnicos ou condicións de programas no corpo da noticia
- Poñer no título ou primeiro parágrafo "A Xunta de Goberno aproba..."
- Describir competencias orgánicas nin pasos administrativos internos
- Usar fórmulas xurídico-administrativas ("En virtude de...", "De conformidade co artigo...", etc.)
- Usar Title Case (cada palabra en maiúscula) en títulos ou encabezamentos

Sempre debes:
- Enfocar na acción final: proxectos, servizos, investimentos, programas, eventos
- Destacar o beneficio concreto para a xente e o territorio
`;

const extractJson = (text: string) => {
  const jsonStr = text.trim();
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  const firstBracket = jsonStr.indexOf('[');
  const lastBracket = jsonStr.lastIndexOf(']');

  // Find the outermost structure (either { } or [ ])
  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    return jsonStr.substring(start, end + 1);
  }
  
  return jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
};

const getSocialMediaPrompt = (lang: string) => {
  const formatInstructions = lang === 'castelán' 
    ? "IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido, sin texto explicativo antes ni después. El JSON debe tener exactamente estas claves: 'instagram', 'facebook', 'x', 'suggestedHashtags' (este último es un array de strings)."
    : "IMPORTANTE: A túa resposta debe ser UNICAMENTE un obxecto JSON válido, sen texto explicativo antes nin despois. O JSON debe ter exactamente estas chaves: 'instagram', 'facebook', 'x', 'suggestedHashtags' (este último é un array de strings).";

  if (lang === 'castelán') {
    return String.raw`${formatInstructions}
A partir de la siguiente nota de prensa, genera las adaptaciones para Instagram, Facebook y X.
No copies frases literales de la nota de prensa; reescribe el contenido adaptado al tono y formato de cada plataforma. Mantén el mismo idioma de la nota.

Regla General: NO uses negritas (asteriscos) ni formato Markdown en ninguna red social.

Facebook:
- Tono: narrativo, cercano, descriptivo. Transforma la nota en una "microhistoria".
- Estructura: Párrafos cortos (una idea por párrafo), frases breves (20-30 palabras). Usa doble salto de línea entre párrafos.
- Emojis: DEBES usar 2-3 emojis como marcadores visuales, sin sustituir palabras.
- Hashtags: Incluye los hashtags al final, en un párrafo aparte.
- Enlace: Incluye enlace a la noticia completa en la web.

Instagram:
- Tono: humano, inspirador, visual.
- Estructura: Gancho inicial potente. CTA: "enlace en la bio" para leer la nota completa. Usa doble salto de línea entre párrafos.
- Emojis: DEBES usar 3-5 emojis naturales, sin sustituir palabras.
- Hashtags: Incluye los hashtags al final, en un párrafo aparte. Evita genéricos.

X:
- Tono: directo, informativo, institucional serio pero accesible. Voz activa.
- Estructura: Tuit de apertura con titular impactante.
- Límite CRÍTICO: Escribe frases extremadamente cortas. CADA tuit debe poder leerse en un vistazo (máximo 2 frases por bloque).
- Hilos: Si la nota es compleja, divide el contenido en un hilo (máximo 3 tuits) separados por un doble salto de línea. Puedes usar indicadores como "(1/3)", "(2/3)" si el contenido lo requiere para mayor claridad, pero no abuses de ellos.
- Final: El último tuit debe contener una llamada a la acción institucional (ej. "Máis información:", "Coñece máis detalles en:"), el enlace y los hashtags.
- Hashtags: #CamelCase, máximo 20% del texto. Inclúyelos al final del último tuit, en un párrafo aparte.
- Emojis: Moderados, úsalos estratégicamente como marcadores visuales al inicio de párrafos o para destacar puntos clave (🧵 en el primer tuit si es un hilo).
- Accesibilidad: NO incluyas Alt Text en X.`;
  }
  return String.raw`${formatInstructions}
A partir da seguinte nota de prensa, xera as adaptacións para Instagram, Facebook e X.
Non copies frases literais da nota de prensa; reescribe o contido adaptado ao ton e formato de cada plataforma. Mantén o mesmo idioma da nota.

Regra Xeral: NON uses negritas (asteriscos) nin formato Markdown en ningunha rede social.

Facebook:
- Ton: narrativo, cercano, descriptivo. Transforma a nota nunha "microhistoria".
- Estrutura: Párrafos curtos (unha idea por parágrafo), frases breves (20-30 palabras). Usa dobre salto de liña entre parágrafos.
- Emojis: DEBES usar 2-3 emojis como marcadores visuais, sen substituír palabras.
- Hashtags: Inclúe os hashtags ao final, nun parágrafo á parte.
- Ligazón: Inclúe enlace á noticia completa na web.

Instagram:
- Ton: humano, inspirador, visual.
- Estrutura: Gancho inicial potente. CTA: "ligazón na bio" para ler a nota completa. Usa dobre salto de liña entre parágrafos.
- Emojis: DEBES usar 3-5 emojis naturais, sen substituír palabras.
- Hashtags: Inclúe os hashtags ao final, nun parágrafo á parte. Evita xenéricos.

X:
- Ton: directo, informativo, institucional serio pero accesible. Voz activa.
- Estrutura: Tuit de apertura con titular impactante.
- Límite CRÍTICO: Escribe frases extremadamente curtas. CADA tuit debe poder lerse nunha ollada (máximo 2 frases por bloque).
- Fíos: Se a nota é complexa, divide o contido nun fío (máximo 3 tuits) separados por un dobre salto de liña. Podes usar indicadores como "(1/3)", "(2/3)" se o contido o require para maior claridade, pero non abuses deles.
- Final: O último tuit debe conter unha chamada á acción institucional (ex. "Máis información:", "Coñece máis detalles en:"), a ligazón e os hashtags.
- Hashtags: #CamelCase, máximo 20% do texto. Inclúeos ao final do último tuit, nun parágrafo á parte.
- Emojis: Moderados, úsaos estratexicamente como marcadores visuais ao inicio de parágrafos ou para destacar puntos clave (🧵 no primeiro tuit se é un fío).
- Accesibilidade: NON inclúas Alt Text en X.`;
};

const TRANSLATIONS = {
  galego: {
    title: "Asistente de notas de prensa",
    subtitle: "Deputación Provincial de Lugo",
    history: "Historial",
    clearHistory: "Limpar historial",
    clearHistoryConfirm: "Estás seguro de que queres borrar todo o historial? Esta acción non se pode desfacer.",
    noHistory: "Non hai notas gardadas aínda.",
    storage: "Espazo en memoria",
    storageDesc: "O historial gárdase localmente no teu navegador. Recoméndase non exceder o 80% para un rendemento óptimo.",
    welcomeTitle: "Benvido ao Asistente de Notas de Prensa",
    welcomeDesc: "Transforma documentos administrativos e información bruta en notas de prensa profesionais e contido para redes sociais en segundos.",
    viewGuide: "Ver guía de uso",
    langLegend: "O idioma seleccionado define a lingua da interface e da IA.",
    apiConfigTitle: "Configuración de API",
    apiConfigDesc: "Configura a túa chave para que a aplicación poida funcionar.",
    apiKeyLabel: "API KEY",
    modelLabel: "MODELO",
    providerLabel: "PROVEDOR",
    geminiRecommended: "Google Gemini (Recomendado)",
    openRouterFreeModels: "OpenRouter (Modelos de balde)",
    apiKeyPlaceholder: "Introduce a túa API Key",
    modelPlaceholder: "Nome do modelo (ex: gemini-1.5-pro)",
    customModel: "Outro (Personalizado)",
    howToGetApiKey: "Como obter unha API Key de balde?",
    geminiFree: "Uso gratuíto con límites de velocidade",
    openRouterFree: "Acceso a modelos free",
    saveConfig: "Gardar configuración",
    securityNote: "A túa chave gárdase localmente no teu navegador. Nunca se envía aos nosos servidores nin se comparte con ninguén.",
    guideTitle: "Guía de uso do Asistente",
    step0: "Paso 0: Configuración de API",
    step0Desc1: "1. Para que a APP funcione cómpre introducir unha API Key no apartado correspondente.",
    step0Desc2: "2. Alí explícase como facelo e as opcións que hai.",
    step1: "Paso 1: Entrada",
    step1Desc1: "3. Escribe a información ou sube un arquivo (PDF, Word ou TXT).",
    step1Desc2: "4. Selecciona o idioma de saída (Galego ou Castelán) na cabeceira.",
    step2: "Paso 2: Xeración",
    step2Desc1: "5. Preme en \"Redactar nota de prensa\" e agarda uns segundos.",
    step2Desc2: "6. Revisa os títulos alternativos e selecciona o que máis che guste.",
    step3: "Paso 3: Redes Sociais",
    step3Desc1: "7. Xera as adaptacións para redes sociais co botón correspondente.",
    step3Desc2: "8. Edita os textos ou xestiona os hashtags antes de copialos.",
    step4: "Paso 4: Compartir",
    step4Desc1: "9. Copia o texto ou compárteo directamente por correo electrónico.",
    step4Desc2: "10. Consulta o historial para recuperar traballos anteriores.",
    understood: "Entendido",
    sourceInfo: "Información fonte",
    pasteText: "Escribe ou pega o texto aquí:",
    placeholder: "Ex: A Xunta de Goberno aprobou hoxe un investimento de 180.000 euros para arranxar a estrada provincial LU-P-1234...",
    or: "OU",
    uploadDoc: "Sube o teu documento:",
    dragDrop: "Fai clic ou arrastra para subir",
    allowedFiles: "PDF, Word (.docx) ou TXT",
    generateBtn: "Redactar nota de prensa",
    generating: "Xerando nota de prensa...",
    translatingContent: "Traducindo contido...",
    adaptingTo: "Adaptando a nota de prensa e as redes sociais ao {lang}.",
    processingInfo: "Procesando información...",
    processingDesc: "Aplicando estilo xornalístico, eliminando xerga administrativa e estruturando o contido.",
    pressNote: "Nota de prensa",
    shareEmail: "Compartir por correo",
    copyText: "Copiar texto",
    altTitles: "Títulos alternativos suxeridos:",
    socialTitle: "Adaptacións para redes sociais",
    generateSocial: "Xerar contido social",
    socialLoadingDesc: "Adaptando formatos para Instagram, Facebook e X...",
    hashtags: "Hashtags",
    addHashtagPlaceholder: "Engadir hashtag...",
    socialEmpty: "Fai clic no botón superior para xerar as adaptacións para redes sociais.",
    errorNoInput: "Por favor, introduce texto ou sube un arquivo.",
    errorExtension: "non se pode procesar porque ten unha extensión non permitida. As extensións válidas son: .PDF, .DOCX e .TXT. Por favor, utiliza un destes formatos para que o asistente poida ler o contido correctamente.",
    errorFile: "O ficheiro non se pode procesar.",
    errorScanty: "A información proporcionada é moi escasa.",
    errorGen: "Erro ao xerar a nota de prensa.",
    errorSocial: "Erro ao xerar as adaptacións para redes sociais.",
    errorTrans: "Erro ao traducir o contido."
  },
  castelán: {
    title: "Asistente de notas de prensa",
    subtitle: "Diputación Provincial de Lugo",
    history: "Historial",
    clearHistory: "Limpiar historial",
    clearHistoryConfirm: "¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.",
    noHistory: "No hay notas guardadas todavía.",
    storage: "Espacio en memoria",
    storageDesc: "El historial se guarda localmente en tu navegador. Se recomienda no exceder el 80% para un rendimiento óptimo.",
    welcomeTitle: "Bienvenido al Asistente de Notas de Prensa",
    welcomeDesc: "Transforma documentos administrativos e información bruta en notas de prensa profesionales y contenido para redes sociales en segundos.",
    viewGuide: "Ver guía de uso",
    langLegend: "El idioma seleccionado define el idioma de la interfaz y de la IA.",
    apiConfigTitle: "Configuración de API",
    apiConfigDesc: "Configura tu clave para que la aplicación pueda funcionar.",
    apiKeyLabel: "API KEY",
    modelLabel: "MODELO",
    providerLabel: "PROVEEDOR",
    geminiRecommended: "Google Gemini (Recomendado)",
    openRouterFreeModels: "OpenRouter (Modelos gratuitos)",
    apiKeyPlaceholder: "Introduce tu API Key",
    modelPlaceholder: "Nombre del modelo (ej: gemini-1.5-pro)",
    customModel: "Otro (Personalizado)",
    howToGetApiKey: "¿Cómo obtener una API Key gratis?",
    geminiFree: "Uso gratuito con límites de velocidad",
    openRouterFree: "Acceso a modelos free",
    saveConfig: "Guardar configuración",
    securityNote: "Tu clave se guarda localmente en tu navegador. Nunca se envía a nuestros servidores ni se comparte con nadie.",
    guideTitle: "Guía de uso del Asistente",
    step0: "Paso 0: Configuración de API",
    step0Desc1: "1. Para que la APP funcione es necesario introducir una API Key en el apartado correspondiente.",
    step0Desc2: "2. Allí se explica cómo hacerlo y las opciones que hay.",
    step1: "Paso 1: Entrada",
    step1Desc1: "3. Escribe la información o sube un archivo (PDF, Word o TXT).",
    step1Desc2: "4. Selecciona el idioma de salida (Gallego o Castellano) en la cabecera.",
    step2: "Paso 2: Generación",
    step2Desc1: "5. Pulsa en \"Redactar nota de prensa\" y espera unos segundos.",
    step2Desc2: "6. Revisa los títulos alternativos y selecciona el que más te guste.",
    step3: "Paso 3: Redes Sociales",
    step3Desc1: "7. Genera las adaptaciones para redes sociales con el botón correspondiente.",
    step3Desc2: "8. Edita los textos o gestiona los hashtags antes de copiarlos.",
    step4: "Paso 4: Compartir",
    step4Desc1: "9. Copia el texto o compártelo directamente por correo electrónico.",
    step4Desc2: "10. Consulta el historial para recuperar trabajos anteriores.",
    understood: "Entendido",
    sourceInfo: "Información fuente",
    pasteText: "Escribe o pega el texto aquí:",
    placeholder: "Ej: La Junta de Gobierno aprobó hoy una inversión de 180.000 euros para arreglar la carretera provincial LU-P-1234...",
    or: "O",
    uploadDoc: "Sube tu documento:",
    dragDrop: "Haz clic o arrastra para subir",
    allowedFiles: "PDF, Word (.docx) o TXT",
    generateBtn: "Redactar nota de prensa",
    generating: "Generando nota de prensa...",
    translatingContent: "Traduciendo contenido...",
    adaptingTo: "Adaptando la nota de prensa y las redes sociales al {lang}.",
    processingInfo: "Procesando información...",
    processingDesc: "Aplicando estilo periodístico, eliminando jerga administrativa y estructurando el contenido.",
    pressNote: "Nota de prensa",
    shareEmail: "Compartir por correo",
    copyText: "Copiar texto",
    altTitles: "Títulos alternativos sugeridos:",
    socialTitle: "Adaptaciones para redes sociales",
    generateSocial: "Generar contenido social",
    socialLoadingDesc: "Adaptando formatos para Instagram, Facebook y X...",
    hashtags: "Hashtags",
    addHashtagPlaceholder: "Añadir hashtag...",
    socialEmpty: "Haz clic en el botón superior para generar las adaptaciones para redes sociales.",
    errorNoInput: "Por favor, introduce texto o sube un archivo.",
    errorExtension: "no se puede procesar porque tiene una extensión no permitida. Las extensiones válidas son: .PDF, .DOCX y .TXT. Por favor, utiliza uno de estos formatos para que el asistente pueda leer el contenido correctamente.",
    errorFile: "El archivo no se puede procesar.",
    errorScanty: "La información proporcionada es muy escasa.",
    errorGen: "Error al generar la nota de prensa.",
    errorSocial: "Error al generar las adaptaciones para redes sociales.",
    errorTrans: "Error al traducir el contenido."
  }
};

export default function App() {
  const { config, clearConfig } = useApiConfig();
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [language, setLanguage] = useState<'galego' | 'castelán'>('castelán');
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pressNote, setPressNote] = useState<string | null>(null);
  const [socialMedia, setSocialMedia] = useState<{ instagram: string; facebook: string; x: string; suggestedHashtags: string[] } | null>(null);
  const [alternativeTitles, setAlternativeTitles] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [translationsCache, setTranslationsCache] = useState<Record<string, { pressNote: string | null; socialMedia: any | null }>>({});
  const [storageUsage, setStorageUsage] = useState(0);
  const [newHashtag, setNewHashtag] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('press_notes_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        setStorageUsage(savedHistory.length);
      } catch (e) {
        console.error("Error loading history", e);
      }
    }
  }, []);

  const saveToHistory = (note: string, social: any) => {
    const newItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      pressNote: note,
      socialMedia: social,
      language,
      title: note.split('\n')[0].replace(/[#*]/g, '').trim() || 'Nota de prensa sen título'
    };

    const newHistory = [newItem, ...history].slice(0, 20); // Limit to 20 items
    setHistory(newHistory);
    const historyString = JSON.stringify(newHistory);
    localStorage.setItem('press_notes_history', historyString);
    setStorageUsage(historyString.length);
  };

  const updateHistorySocial = (social: any) => {
    if (history.length === 0) return;
    const newHistory = [...history];
    newHistory[0].socialMedia = social;
    setHistory(newHistory);
    const historyString = JSON.stringify(newHistory);
    localStorage.setItem('press_notes_history', historyString);
    setStorageUsage(historyString.length);
  };

  const deleteFromHistory = (id: number) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    const historyString = JSON.stringify(newHistory);
    localStorage.setItem('press_notes_history', historyString);
    setStorageUsage(historyString.length);
  };

  const clearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('press_notes_history');
    setStorageUsage(0);
    setShowClearConfirm(false);
  };

  const loadFromHistory = (item: any) => {
    setPressNote(item.pressNote);
    setSocialMedia(item.socialMedia);
    setLanguage(item.language);
    setTranslationsCache({ [item.language]: { pressNote: item.pressNote, socialMedia: item.socialMedia } });
    setIsHistoryOpen(false); // Close history on mobile after selection
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let selectedFile: File | undefined;
    
    if ('files' in e.target && e.target.files?.[0]) {
      selectedFile = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files?.[0]) {
      selectedFile = e.dataTransfer.files[0];
    }

    if (!selectedFile) return;

    // Robust validation: check extension
    const allowedExtensions = ['.txt', '.pdf', '.docx', '.doc'];
    const fileName = selectedFile.name.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasAllowedExtension) {
      setError(`${t.errorFile} "${selectedFile.name}" ${t.errorExtension}`);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    try {
      if (selectedFile.type === 'text/plain' || fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        setFileContent(text);
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        // For docx, use mammoth. For doc, it might not work, but let's try.
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFileContent(result.value);
      } else if (selectedFile.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Read PDF as base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setFileContent(base64); // This will store base64 string
        };
        reader.readAsDataURL(selectedFile);
      }
    } catch (err) {
      console.error(err);
      setError(t.errorFile);
      setFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e);
  };

  const generatePressNote = async () => {
    const combinedContent = (inputText.trim() + (fileContent || '')).trim();
    
    if (!inputText.trim() && !file) {
      setError(t.errorNoInput);
      return;
    }

    const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

    if (combinedContent.length > 0 && combinedContent.length < 50 && !isPdf) {
      setError(t.errorScanty);
      return;
    }

    setLoading(true);
    setError(null);
    setPressNote(null);
    setSocialMedia(null);
    setTranslationsCache({});

    // Scroll to output section on mobile
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      if (!config) {
        setError("Configuración de API no encontrada");
        return;
      }
      
      const promptText = `Xera unha nota de prensa a partir da seguinte información. O idioma de saída debe ser ${language.toUpperCase()}.\n\nInformación:\n${inputText}\n\n${(fileContent && !isPdf) ? `Contido do arquivo:\n${fileContent}` : ''}`;
      
      let fileData: { data: string, mimeType: string } | undefined;
      if (isPdf && fileContent) {
        fileData = { data: fileContent, mimeType: 'application/pdf' };
      }
      
      const responseStream = await callApi(config, promptText, SYSTEM_INSTRUCTION, true, fileData);

      let fullResponse = '';
      
      if (config.provider === 'gemini') {
        const stream = responseStream as AsyncIterable<any>;
        for await (const chunk of stream) {
          fullResponse += chunk.text;
          setPressNote(fullResponse);
        }
      } else if (config.provider === 'openrouter') {
        const stream = responseStream as ReadableStream<Uint8Array>;
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // OpenRouter streaming response is SSE
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                const text = json.choices[0].delta.content;
                if (text) {
                  fullResponse += text;
                  setPressNote(fullResponse);
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }
      
      // Generate alternative titles
      generateAlternativeTitles(fullResponse);
      
      // Save to history after generation (without social media yet)
      saveToHistory(fullResponse, null);
      
      // Initialize translation cache with the original generation
      setTranslationsCache({ [language]: { pressNote: fullResponse, socialMedia: null } });
    } catch (err) {
      console.error(err);
      setError(t.errorGen);
    } finally {
      setLoading(false);
    }
  };

  const generateAlternativeTitles = async (content: string) => {
    try {
      if (!config) return;
      const response = await callApi(config, `Baseándote na seguinte nota de prensa, suxire 3 títulos alternativos atractivos e xornalísticos. Devolve un JSON cun array de strings chamado "titles".\n\nNota de prensa:\n${content}`, "", false);

      if (response.text) {
        const jsonString = extractJson(response.text);
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed && parsed.titles && Array.isArray(parsed.titles)) {
            setAlternativeTitles(parsed.titles);
          }
        } catch (e) {
          console.error("Error parsing alternative titles JSON:", e);
        }
      }
    } catch (err) {
      console.error("Erro ao xerar títulos alternativos:", err);
    }
  };

  const selectTitle = (newTitle: string) => {
    if (!pressNote) return;
    const lines = pressNote.split('\n');
    // Assuming the first line is the title (usually starts with # or **)
    // We try to find the first non-empty line that looks like a title
    let titleIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        titleIndex = i;
        break;
      }
    }

    if (titleIndex !== -1) {
      const oldTitle = lines[titleIndex];
      // Preserve markdown formatting if present
      let formattedTitle = newTitle;
      if (oldTitle.startsWith('**') && oldTitle.endsWith('**')) {
        formattedTitle = `**${newTitle}**`;
      } else if (oldTitle.startsWith('# ')) {
        formattedTitle = `# ${newTitle}`;
      } else if (oldTitle.startsWith('## ')) {
        formattedTitle = `## ${newTitle}`;
      }
      
      lines[titleIndex] = formattedTitle;
      const updatedNote = lines.join('\n');
      setPressNote(updatedNote);
      setTranslationsCache(prev => ({
        ...prev,
        [language]: { ...prev[language], pressNote: updatedNote }
      }));
      
      // Update history
      const updatedHistory = history.map((item, index) => {
        if (index === 0) return { ...item, pressNote: updatedNote, title: newTitle };
        return item;
      });
      setHistory(updatedHistory);
      localStorage.setItem('press_notes_history', JSON.stringify(updatedHistory));
    }
  };

  const generateMoreHashtags = async () => {
    if (!pressNote || !socialMedia || !config) return;
    
    setSocialLoading(true);
    try {
      const response = await callApi(config, `Baseándote na seguinte nota de prensa, xera 10 hashtags adicionais relevantes e diferentes aos xa propostos. Devolve un JSON cun array de strings chamado "hashtags".\n\nNota de prensa:\n${pressNote}\n\nHashtags actuais:\n${(socialMedia.suggestedHashtags || []).join(', ')}`, "", false);

      if (response.text) {
        const parsed = JSON.parse(extractJson(response.text));
        const newSocialMedia = {
          ...socialMedia,
          suggestedHashtags: [...new Set([...socialMedia.suggestedHashtags, ...parsed.hashtags])]
        };
        setSocialMedia(newSocialMedia);
        setTranslationsCache(prev => ({
          ...prev,
          [language]: { ...prev[language], socialMedia: newSocialMedia }
        }));
        updateHistorySocial(newSocialMedia);
      }
    } catch (err) {
      console.error("Erro ao xerar máis hashtags:", err);
    } finally {
      setSocialLoading(false);
    }
  };

  const generateSocialMedia = async () => {
    if (!pressNote || !config) return;
    
    setSocialLoading(true);
    setError(null);

    try {
      const response = await callApi(config, `${getSocialMediaPrompt(language)}\n\n${language === 'castelán' ? 'Nota de prensa original en castellano' : 'Nota de prensa orixinal en galego'}:\n${pressNote}`, "", false);

      if (response.text) {
        const parsed = JSON.parse(extractJson(response.text));
        setSocialMedia(parsed);
        setTranslationsCache(prev => ({
          ...prev,
          [language]: { ...prev[language], socialMedia: parsed }
        }));
        
        // Update history item with social media content
        if (pressNote) {
          const updatedHistory = history.map((item, index) => {
            if (index === 0) return { ...item, socialMedia: parsed };
            return item;
          });
          setHistory(updatedHistory);
          localStorage.setItem('press_notes_history', JSON.stringify(updatedHistory));
        }
      }
    } catch (err) {
      console.error(err);
      setError(t.errorSocial);
    } finally {
      setSocialLoading(false);
    }
  };

  const shareViaEmail = () => {
    if (!pressNote) return;
    const title = pressNote.split('\n')[0].replace(/[#*]/g, '').trim();
    const body = pressNote;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const updateSocialContent = (platform: 'instagram' | 'facebook' | 'x', content: string) => {
    if (!socialMedia) return;
    const updated = { ...socialMedia, [platform]: content };
    setSocialMedia(updated);
    
    // Update history
    const updatedHistory = history.map((item, index) => {
      if (index === 0) return { ...item, socialMedia: updated };
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem('press_notes_history', JSON.stringify(updatedHistory));
  };

  const addHashtag = () => {
    if (!socialMedia || !newHashtag.trim()) return;
    const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
    const hashtags = socialMedia.suggestedHashtags || [];
    if (hashtags.includes(tag)) return;
    
    const updated = {
      ...socialMedia,
      suggestedHashtags: [...hashtags, tag]
    };
    setSocialMedia(updated);
    setNewHashtag('');
    
    // Update history
    const updatedHistory = history.map((item, index) => {
      if (index === 0) return { ...item, socialMedia: updated };
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem('press_notes_history', JSON.stringify(updatedHistory));
  };

  const removeHashtag = (tagToRemove: string) => {
    if (!socialMedia) return;
    const hashtags = socialMedia.suggestedHashtags || [];
    const updated = {
      ...socialMedia,
      suggestedHashtags: hashtags.filter(tag => tag !== tagToRemove)
    };
    setSocialMedia(updated);
    
    // Update history
    const updatedHistory = history.map((item, index) => {
      if (index === 0) return { ...item, socialMedia: updated };
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem('press_notes_history', JSON.stringify(updatedHistory));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const handleLanguageChange = async (newLang: 'galego' | 'castelán') => {
    if (newLang === language || !config) return;
    
    // Save current state to cache before switching
    const updatedCache = {
      ...translationsCache,
      [language]: { pressNote, socialMedia }
    };
    setTranslationsCache(updatedCache);

    setLanguage(newLang);
    
    if (!pressNote) return;

    // Check if we already have the translation cached for this session
    if (updatedCache[newLang]) {
      setPressNote(updatedCache[newLang].pressNote);
      setSocialMedia(updatedCache[newLang].socialMedia);
      return;
    }
    
    setIsTranslating(true);
    setError(null);
    try {
      const notePromise = callApi(config, `Traduce a seguinte nota de prensa ao ${newLang.toUpperCase()}. Mantén exactamente o mesmo formato (Markdown), estrutura e ton xornalístico/institucional. Devolve ÚNICAMENTE o texto traducido, sen introducións, sen comiñas e sen texto adicional.\n\nTexto orixinal:\n${pressNote}`, "", false);

      let socialPromise = null;
      if (socialMedia) {
        socialPromise = callApi(config, `Traduce o seguinte contido de redes sociais ao ${newLang.toUpperCase()}. Devolve un JSON válido cas mesmas chaves ("instagram", "facebook", "x", "suggestedHashtags") e os valores traducidos, mantendo os emojis e adaptando os hashtags.\n\nContido orixinal:\n${JSON.stringify(socialMedia)}`, "", false);
      }

      const [noteResponse, socialResponse] = await Promise.all([notePromise, socialPromise]);
      
      let translatedNote = pressNote;
      if (noteResponse.text) {
        translatedNote = noteResponse.text;
        setPressNote(translatedNote);
      }

      let translatedSocial = socialMedia;
      if (socialResponse && socialResponse.text) {
        translatedSocial = JSON.parse(extractJson(socialResponse.text));
        setSocialMedia(translatedSocial);
      }

      // Update cache with the new translation
      setTranslationsCache(prev => ({
        ...prev,
        [newLang]: { pressNote: translatedNote, socialMedia: translatedSocial }
      }));

      // Update history with translation
      saveToHistory(translatedNote, translatedSocial);

    } catch (err) {
      console.error(err);
      setError(t.errorTrans);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Helmet>
        <title>Asistente de Redacción - Deputación de Lugo</title>
        <meta name="description" content="Asistente inteligente para la redacción de notas de prensa y contenidos para redes sociales con estilo institucional." />
        <meta property="og:title" content="Asistente de Redacción - Deputación de Lugo" />
        <meta property="og:description" content="Asistente inteligente para la redacción de notas de prensa y contenidos para redes sociales con estilo institucional." />
        <meta property="og:image" content="/thumbnail.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <ApiConfigModal 
        open={showApiConfig} 
        onOpenChange={setShowApiConfig} 
        t={t}
      />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-6">
            <div className="flex items-center gap-1 sm:gap-6 overflow-hidden flex-1 sm:flex-none">
              <div className="h-5 sm:h-8 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src="/images/mencia.png" 
                  alt="Logo Mencia" 
                  className="h-full w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="border-l border-slate-200 pl-1 sm:pl-6 overflow-hidden min-w-0">
                <h1 className="font-bold text-[10px] xs:text-[11px] sm:text-lg leading-tight text-slate-900 sm:truncate">{t.title}</h1>
                <p className="text-[7px] xs:text-[8px] sm:text-xs text-slate-500 font-medium truncate">{t.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => setShowApiConfig(true)}
                title="Configuración API"
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-full text-[9px] sm:text-xs font-bold transition-all shrink-0",
                  config 
                    ? "bg-green-50 text-green-700 border border-green-100 hover:bg-green-100" 
                    : "bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-100 animate-pulse"
                )}
              >
                <Key className="w-3 h-3" />
                <span className="hidden xs:inline">API KEY</span>
                {config && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />}
              </button>
              
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title={t.history}
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-end gap-1 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto relative group/lang">
              <button
                onClick={() => handleLanguageChange('galego')}
                disabled={isTranslating}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors disabled:opacity-50",
                  language === 'galego' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Galego
              </button>
              <button
                onClick={() => handleLanguageChange('castelán')}
                disabled={isTranslating}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors disabled:opacity-50",
                  language === 'castelán' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Castellano
              </button>
              
              {/* Subtle legend on hover/active */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-[200px] sm:max-w-[280px] text-center opacity-0 group-hover/lang:opacity-100 group-active/lang:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="text-[9px] text-slate-500 bg-white/95 backdrop-blur-sm py-1 px-2 rounded-md shadow-md border border-slate-100 leading-tight">
                  {t.langLegend}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-50 p-2 rounded-lg">
                <HelpCircle className="w-5 h-5 text-[#da291c]" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Asistente de notas de prensa</h2>
            </div>
            <p className="text-slate-600 text-sm max-w-2xl">
              {t.welcomeDesc}
            </p>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            {t.viewGuide}
          </button>
        </div>

        {/* User Guide Modal */}
        <DialogPrimitive.Root open={showGuide} onOpenChange={setShowGuide}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
            <DialogPrimitive.Content aria-describedby={undefined} className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 outline-none">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <DialogPrimitive.Title className="text-lg font-bold text-slate-900">
                    {t.guideTitle}
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close className="p-2 hover:bg-slate-200 rounded-full transition-colors outline-none">
                  <X className="w-5 h-5 text-slate-500" />
                </DialogPrimitive.Close>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-bold text-[#da291c] uppercase tracking-widest mb-3">{t.step0}</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">1</div>
                          <p className="text-sm text-slate-600">
                            {t.step0Desc1.replace(/^\d+\.\s+/, '')} <Key className="w-4 h-4 inline text-green-600" />
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">2</div>
                          <p className="text-sm text-slate-600">{t.step0Desc2.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-[#da291c] uppercase tracking-widest mb-3">{t.step1}</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">3</div>
                          <p className="text-sm text-slate-600">{t.step1Desc1.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">4</div>
                          <p className="text-sm text-slate-600">{t.step1Desc2.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-[#da291c] uppercase tracking-widest mb-3">{t.step2}</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">5</div>
                          <p className="text-sm text-slate-600">{t.step2Desc1.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">6</div>
                          <p className="text-sm text-slate-600">{t.step2Desc2.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-bold text-[#da291c] uppercase tracking-widest mb-3">{t.step3}</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">7</div>
                          <p className="text-sm text-slate-600">{t.step3Desc1.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">8</div>
                          <p className="text-sm text-slate-600">{t.step3Desc2.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-[#da291c] uppercase tracking-widest mb-3">{t.step4}</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">9</div>
                          <p className="text-sm text-slate-600">{t.step4Desc1.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-[#da291c] flex items-center justify-center text-xs font-bold shrink-0">10</div>
                          <p className="text-sm text-slate-600">{t.step4Desc2.replace(/^\d+\.\s+/, '')}</p>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="px-8 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  {t.understood}
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        {/* Clear History Confirm Modal */}
        <DialogPrimitive.Root open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
            <DialogPrimitive.Content aria-describedby={undefined} className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 outline-none">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <DialogPrimitive.Title className="text-lg font-bold text-slate-900">
                    {t.clearHistory}
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close className="p-2 hover:bg-slate-200 rounded-full transition-colors outline-none">
                  <X className="w-5 h-5 text-slate-500" />
                </DialogPrimitive.Close>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 mb-6">{t.clearHistoryConfirm}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmClearHistory}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    {t.clearHistory}
                  </button>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* History Sidebar */}
          <div className={cn(
            "lg:col-span-3 space-y-6",
            isHistoryOpen ? "fixed inset-0 z-40 bg-white p-4 lg:relative lg:inset-auto lg:p-0 lg:bg-transparent" : "hidden lg:block"
          )}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full lg:h-[calc(100vh-12rem)] lg:sticky lg:top-28">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  {t.history}
                </h3>
                <div className="flex items-center gap-1">
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title={t.clearHistory}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className="lg:hidden p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {history.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm italic">
                    {t.noHistory}
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className="group p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer relative"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="text-xs text-slate-400 mb-1 flex justify-between">
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                        <span className="uppercase font-bold text-[10px]">{item.language}</span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-800 line-clamp-2 pr-6">
                        {item.title}
                      </h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromHistory(item.id);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {t.storage}
                  </span>
                  <span>{Math.round((storageUsage / (5 * 1024 * 1024)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      (storageUsage / (5 * 1024 * 1024)) > 0.8 ? "bg-red-500" : "bg-[#da291c]"
                    )}
                    style={{ width: `${Math.max(2, Math.min(100, (storageUsage / (5 * 1024 * 1024)) * 100))}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                  {t.storageDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className={cn("lg:col-span-4 space-y-6", isHistoryOpen && "hidden lg:block")}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  {t.sourceInfo}
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {t.pasteText}
                    </label>
                    <button 
                      onClick={() => setInputText('')}
                      className="text-xs text-slate-500 hover:text-[#da291c] transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Limpiar
                    </button>
                  </div>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full h-48 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none resize-none text-sm"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-slate-500 uppercase font-medium">{t.or}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-2">
                    {t.uploadDoc}
                  </span>
                  <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                      isDragging ? "border-[#da291c] bg-red-50" : (file ? "border-[#da291c] bg-red-50" : "border-slate-300 hover:border-slate-400 bg-slate-50")
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".txt,.pdf,.docx"
                      className="hidden"
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-2 relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setFile(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <FileText className="w-8 h-8 text-[#da291c]" />
                        <span className="text-sm font-medium text-slate-900">{file.name}</span>
                        <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Upload className="w-8 h-8" />
                        <span className="text-sm font-medium text-slate-900">{t.dragDrop}</span>
                        <span className="text-xs">{t.allowedFiles}</span>
                      </div>
                    )}
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  onClick={generatePressNote}
                  disabled={loading || (!inputText.trim() && !file)}
                  className="w-full bg-[#da291c] hover:bg-[#b82218] text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.generating}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t.generateBtn}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div ref={outputRef} className={cn("lg:col-span-5 space-y-6 relative", (!pressNote && !loading) || isHistoryOpen ? "hidden lg:block" : "block")}>
            {isTranslating && (
                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center border border-slate-200">
                  <Languages className="w-10 h-10 text-[#da291c] mb-4 animate-pulse" />
                  <p className="text-lg font-medium text-slate-900">{t.translatingContent}</p>
                  <p className="text-sm text-slate-500 mt-2">{t.adaptingTo.replace('{lang}', language === 'galego' ? 'galego' : 'castelán')}</p>
                </div>
              )}
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500 min-h-[400px]">
                  <Loader2 className="w-10 h-10 animate-spin text-[#da291c] mb-4" />
                  <p className="text-lg font-medium text-slate-900">{t.processingInfo}</p>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
                    {t.processingDesc}
                  </p>
                </div>
              ) : pressNote ? (
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800">{t.pressNote}</h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={shareViaEmail}
                          className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                          title={t.shareEmail}
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => copyToClipboard(pressNote)}
                          className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                          title={t.copyText}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setPressNote('')}
                          className="text-slate-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                          title="Limpiar nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6 prose prose-slate prose-p:leading-relaxed max-w-none">
                      <div className="markdown-body">
                        <Markdown>{pressNote}</Markdown>
                      </div>
                    </div>
                    
                    {alternativeTitles.length > 0 && (
                      <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">{t.altTitles}</h4>
                        <div className="space-y-2">
                          {alternativeTitles.map((title, i) => (
                            <button
                              key={i}
                              onClick={() => selectTitle(title)}
                              className="w-full text-left p-2.5 text-sm border border-slate-200 rounded-lg hover:border-[#da291c] hover:bg-red-50 transition-all text-slate-700 font-medium"
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Media Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800">{t.socialTitle}</h3>
                      {!socialMedia && (
                        <button
                          onClick={generateSocialMedia}
                          disabled={socialLoading}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {socialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          {t.generateSocial}
                        </button>
                      )}
                    </div>
                    
                    {socialLoading ? (
                      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
                        <p className="text-sm">{t.socialLoadingDesc}</p>
                      </div>
                    ) : socialMedia ? (
                      <TabsPrimitive.Root defaultValue="instagram" className="flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-200 bg-slate-50/50">
                          <TabsPrimitive.List className="flex overflow-x-auto whitespace-nowrap scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <TabsPrimitive.Trigger
                              value="instagram"
                              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 data-[state=active]:text-[#E1306C] data-[state=active]:border-b-2 data-[state=active]:border-[#E1306C] outline-none transition-colors shrink-0"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </TabsPrimitive.Trigger>
                            <TabsPrimitive.Trigger
                              value="facebook"
                              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 data-[state=active]:text-[#1877F2] data-[state=active]:border-b-2 data-[state=active]:border-[#1877F2] outline-none transition-colors shrink-0"
                            >
                              <Facebook className="w-4 h-4" />
                              Facebook
                            </TabsPrimitive.Trigger>
                            <TabsPrimitive.Trigger
                              value="x"
                              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black outline-none transition-colors shrink-0"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                              X
                            </TabsPrimitive.Trigger>
                            <TabsPrimitive.Trigger
                              value="hashtags"
                              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 outline-none transition-colors shrink-0"
                            >
                              <RefreshCw className="w-4 h-4" />
                              {t.hashtags}
                            </TabsPrimitive.Trigger>
                          </TabsPrimitive.List>
                          <button 
                            onClick={() => setSocialMedia(null)}
                            className="text-slate-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors mr-2"
                            title="Limpiar RRSS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <TabsPrimitive.Content value="instagram" className="p-6 outline-none">
                          <div className="flex justify-end mb-2">
                            <button onClick={() => copyToClipboard(socialMedia.instagram)} className="text-slate-400 hover:text-slate-600"><Copy className="w-4 h-4" /></button>
                          </div>
                          <textarea
                            value={socialMedia.instagram}
                            onChange={(e) => updateSocialContent('instagram', e.target.value)}
                            className="w-full h-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none resize-none text-sm leading-relaxed font-sans text-slate-800 bg-slate-50/30"
                          />
                        </TabsPrimitive.Content>

                        <TabsPrimitive.Content value="facebook" className="p-6 outline-none">
                          <div className="flex justify-end mb-2">
                            <button onClick={() => copyToClipboard(socialMedia.facebook)} className="text-slate-400 hover:text-slate-600"><Copy className="w-4 h-4" /></button>
                          </div>
                          <textarea
                            value={socialMedia.facebook}
                            onChange={(e) => updateSocialContent('facebook', e.target.value)}
                            className="w-full h-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none resize-none text-sm leading-relaxed font-sans text-slate-800 bg-slate-50/30"
                          />
                        </TabsPrimitive.Content>

                        <TabsPrimitive.Content value="x" className="p-6 outline-none">
                          <div className="flex justify-end mb-2">
                            <button onClick={() => copyToClipboard(socialMedia.x)} className="text-slate-400 hover:text-slate-600"><Copy className="w-4 h-4" /></button>
                          </div>
                          <textarea
                            value={socialMedia.x}
                            onChange={(e) => updateSocialContent('x', e.target.value)}
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none resize-none text-sm leading-relaxed font-sans text-slate-800 bg-slate-50/30"
                          />
                        </TabsPrimitive.Content>

                        <TabsPrimitive.Content value="hashtags" className="p-6 outline-none">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex-1 mr-4">
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={newHashtag}
                                  onChange={(e) => setNewHashtag(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                                  placeholder={t.addHashtagPlaceholder}
                                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-[#da291c]"
                                />
                                <button 
                                  onClick={addHashtag}
                                  className="p-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => copyToClipboard((socialMedia.suggestedHashtags || []).join(' '))} className="text-slate-400 hover:text-slate-600" title={t.copyText}><Copy className="w-4 h-4" /></button>
                              <button 
                                onClick={generateMoreHashtags} 
                                disabled={socialLoading}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                {socialLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                {language === 'galego' ? 'Xerar máis' : 'Generar más'}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(socialMedia.suggestedHashtags || []).map((tag, i) => {
                              const tagText = tag.startsWith('#') ? tag : `#${tag}`;
                              return (
                                <span key={i} className="group bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100 flex items-center gap-1.5">
                                  {tagText}
                                  <div className="flex items-center gap-1 ml-1 border-l border-blue-200 pl-1.5">
                                    <button 
                                      onClick={() => copyToClipboard(tagText)}
                                      className="text-blue-300 hover:text-blue-600 transition-colors"
                                      title="Copiar hashtag"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => removeHashtag(tag)}
                                      className="text-blue-300 hover:text-red-500 transition-colors"
                                      title="Eliminar do banco"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </span>
                              );
                            })}
                          </div>
                        </TabsPrimitive.Content>
                      </TabsPrimitive.Root>
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        {t.socialEmpty}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    );
  }
