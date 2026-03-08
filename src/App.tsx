import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, ArrowRight, Loader2, BookOpen, Globe, RefreshCcw, Users, Plus, FileText, AlertCircle, Save, Edit2, Check, Wand2, ArrowLeft } from 'lucide-react';
import { AppState, ExtractedData, ClinicalInsight, Patient, Session } from './types';
import { extractEntities, generateInsight, refineInsight } from './services/ai';

export default function App() {
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  
  // Data State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Current Session State
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [narrativeBlocks, setNarrativeBlocks] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [insight, setInsight] = useState<ClinicalInsight | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  
  // Insight Refinement State
  const [isEditingInsight, setIsEditingInsight] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedPatients = localStorage.getItem('psychostruct_patients');
    const savedSessions = localStorage.getItem('psychostruct_sessions');
    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);

  // Save to LocalStorage when data changes
  useEffect(() => {
    localStorage.setItem('psychostruct_patients', JSON.stringify(patients));
    localStorage.setItem('psychostruct_sessions', JSON.stringify(sessions));
  }, [patients, sessions]);

  // Auto-focus textarea
  useEffect(() => {
    if (appState === 'WRITING' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [appState]);

  const handleCreatePatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPatient: Patient = {
      id: `EXP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      name: formData.get('name') as string,
      age: parseInt(formData.get('age') as string, 10),
      gender: formData.get('gender') as 'Femenino' | 'Masculino' | 'Otro',
      createdAt: Date.now(),
    };
    setPatients([...patients, newPatient]);
    setCurrentPatient(newPatient);
    setAppState('PATIENT_HISTORY');
  };

  const handleLoadPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setAppState('PATIENT_HISTORY');
  };

  const handleExtract = async () => {
    const fullNarrative = [...narrativeBlocks, currentInput].filter(t => t.trim().length > 0).join('\n\n');

    // Local validation before AI analysis
    const trimmedNarrative = fullNarrative.trim();
    const wordCount = trimmedNarrative.split(/\s+/).length;
    
    if (trimmedNarrative.length === 0) {
      setValidationFeedback("Por favor, escribe algo sobre tu situación antes de estructurar.");
      return;
    }

    if (wordCount < 15) {
      setValidationFeedback("Tu relato es muy breve. Por favor, intenta describir con más detalle qué te sucede, cómo te sientes o desde cuándo te ocurre para poder ofrecerte un análisis adecuado.");
      return;
    }

    const repetitivePattern = /(.)\1{4,}/;
    if (repetitivePattern.test(trimmedNarrative)) {
      setValidationFeedback("El texto parece contener caracteres repetitivos o poco claros. Por favor, escribe una descripción clara de tu situación.");
      return;
    }

    const hasVeryLongWords = trimmedNarrative.split(/\s+/).some(word => word.length > 30);
    if (hasVeryLongWords) {
      setValidationFeedback("El texto contiene palabras inusualmente largas. Por favor, revisa tu escritura y describe tu situación con claridad.");
      return;
    }

    if (/^\d+$/.test(trimmedNarrative.replace(/\s/g, ''))) {
      setValidationFeedback("El texto parece contener solo números. Por favor, describe tu situación con palabras.");
      return;
    }
    
    setValidationFeedback(null);
    setAppState('EXTRACTING');
    try {
      const data = await extractEntities(fullNarrative);
      
      if (!data.isValid) {
        setValidationFeedback(data.feedback || "Necesito más detalles para poder analizar tu situación. ¿Podrías profundizar un poco más?");
        if (currentInput.trim()) {
          setNarrativeBlocks(prev => [...prev, currentInput.trim()]);
          setCurrentInput('');
        }
        setAppState('WRITING');
        return;
      }

      if (currentInput.trim()) {
        setNarrativeBlocks(prev => [...prev, currentInput.trim()]);
        setCurrentInput('');
      }
      setExtractedData(data);
      setAppState('STRUCTURED');
    } catch (error) {
      console.error(error);
      setValidationFeedback("Hubo un error de conexión al analizar la narrativa. Por favor, intenta de nuevo.");
      setAppState('WRITING');
    }
  };

  const handleGenerateInsight = async () => {
    if (!extractedData) return;
    
    setAppState('GENERATING_INSIGHT');
    try {
      const result = await generateInsight(extractedData);
      setInsight(result);
      setAppState('INSIGHT_READY');
    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar la interpretación.");
      setAppState('STRUCTURED');
    }
  };

  const handleRefineInsight = async () => {
    if (!insight || !extractedData || !refinementInput.trim()) return;
    
    setAppState('REFINING_INSIGHT');
    try {
      const result = await refineInsight(insight, extractedData, refinementInput);
      setInsight(result);
      setRefinementInput('');
      setAppState('INSIGHT_READY');
    } catch (error) {
      console.error(error);
      alert("Hubo un error al refinar la interpretación.");
      setAppState('INSIGHT_READY');
    }
  };

  const handleManualInsightChange = (field: 'interpretation' | 'closure', value: string) => {
    if (!insight) return;
    setInsight({
      ...insight,
      [field]: value
    });
  };

  const handleSaveSession = () => {
    if (!currentPatient || !extractedData || !insight) return;
    
    const newSession: Session = {
      id: `SES-${Date.now()}`,
      patientId: currentPatient.id,
      date: Date.now(),
      narrative: narrativeBlocks.join('\n\n'),
      extractedData,
      insight,
    };
    
    setSessions([...sessions, newSession]);
    handleDiscardSession();
  };

  const handleDiscardSession = () => {
    setNarrativeBlocks([]);
    setCurrentInput('');
    setExtractedData(null);
    setInsight(null);
    setValidationFeedback(null);
    setAppState('PATIENT_HISTORY');
  };

  const handleReset = () => {
    setNarrativeBlocks([]);
    setCurrentInput('');
    setExtractedData(null);
    setInsight(null);
    setValidationFeedback(null);
    setCurrentPatient(null);
    setAppState('DASHBOARD');
  };

  // --- RENDERERS ---

  if (appState === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-bg-warm text-ink p-4 md:p-8 lg:p-16">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 md:mb-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-border-subtle pb-6 md:pb-8">
            <div className="flex items-center gap-3 md:gap-4">
              <Brain className="w-8 h-8 text-olive" />
              <h1 className="text-2xl md:text-3xl font-serif font-medium tracking-wide text-olive">First Step</h1>
            </div>
            <button 
              onClick={() => setAppState('NEW_PATIENT')}
              className="w-full md:w-auto justify-center bg-ink text-bg-warm px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-ink/80 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo Expediente
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-sm font-mono uppercase tracking-widest text-ink/40 mb-6 flex items-center gap-2">
                <Users className="w-4 h-4" /> Pacientes Activos
              </h2>
              {patients.length === 0 ? (
                <div className="bg-white/40 border border-border-subtle rounded-2xl p-12 text-center">
                  <p className="text-ink/40 font-serif text-lg italic">No hay expedientes registrados aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients.map(p => (
                    <div key={p.id} className="bg-white/60 border border-border-subtle p-6 rounded-2xl hover:border-olive/30 transition-colors cursor-pointer group" onClick={() => handleLoadPatient(p)}>
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="font-medium text-lg leading-tight">{p.name}</h3>
                        <span className="text-xs font-mono bg-bg-panel px-2 py-1 rounded text-ink/60 shrink-0">{p.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60">
                        <span className="whitespace-nowrap">{p.age} años</span>
                        <span className="text-ink/30">•</span>
                        <span className="whitespace-nowrap">{p.gender}</span>
                        <span className="text-ink/30">•</span>
                        <span className="whitespace-nowrap">{sessions.filter(s => s.patientId === p.id).length} Sesiones</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-sm font-mono uppercase tracking-widest text-ink/40 mb-6 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Actividad Reciente
              </h2>
              <div className="space-y-4">
                {sessions.slice().reverse().slice(0, 5).map(s => {
                  const p = patients.find(pat => pat.id === s.patientId);
                  return (
                    <div key={s.id} className="bg-bg-panel border border-border-subtle p-4 rounded-xl">
                      <p className="text-sm font-medium mb-1">{p?.name || 'Desconocido'}</p>
                      <p className="text-xs text-ink/50 font-mono">{new Date(s.date).toLocaleDateString()}</p>
                      <p className="text-xs text-olive mt-2 truncate">{s.extractedData?.theory}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'NEW_PATIENT') {
    return (
      <div className="min-h-screen bg-bg-warm text-ink flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/60 backdrop-blur-md border border-border-subtle p-8 md:p-12 rounded-3xl max-w-md w-full shadow-xl">
          <div className="text-center mb-8">
            <Brain className="w-10 h-10 mx-auto text-olive mb-4" />
            <h2 className="text-2xl font-serif text-ink">Apertura de Expediente</h2>
          </div>
          <form onSubmit={handleCreatePatient} className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-ink/60 mb-2">Nombre Completo</label>
              <input required name="name" type="text" className="w-full bg-transparent border-b-2 border-border-subtle px-0 py-2 text-lg focus:outline-none focus:border-olive transition-colors" placeholder="Ej. Ana García" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-ink/60 mb-2">Edad</label>
              <input required name="age" type="number" min="1" className="w-full bg-transparent border-b-2 border-border-subtle px-0 py-2 text-lg focus:outline-none focus:border-olive transition-colors" placeholder="Ej. 34" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-ink/60 mb-2">Sexo</label>
              <select required name="gender" defaultValue="" className="w-full bg-transparent border-b-2 border-border-subtle px-0 py-2 text-lg focus:outline-none focus:border-olive transition-colors appearance-none cursor-pointer">
                <option value="" disabled>Selecciona una opción</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="pt-4 flex gap-4">
              <button type="button" onClick={() => setAppState('DASHBOARD')} className="flex-1 py-3 text-ink/60 hover:text-ink font-medium transition-colors">Cancelar</button>
              <button type="submit" className="flex-1 bg-olive text-bg-warm py-3 rounded-xl font-medium hover:bg-olive/90 transition-colors shadow-md">Iniciar Sesión</button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  if (appState === 'PATIENT_HISTORY') {
    const patientSessions = sessions.filter(s => s.patientId === currentPatient?.id).sort((a, b) => b.date - a.date);
    
    return (
      <div className="min-h-screen bg-bg-warm text-ink p-4 md:p-8 lg:p-16">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 md:mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-border-subtle pb-6 md:pb-8">
            <div className="flex items-center gap-3 md:gap-4">
              <button onClick={handleReset} className="p-2 hover:bg-ink/5 rounded-full transition-colors mr-2">
                <ArrowLeft className="w-6 h-6 text-ink/60" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-medium tracking-wide text-ink">{currentPatient?.name}</h1>
                <div className="flex items-center gap-3 text-sm text-ink/60 mt-1">
                  <span className="font-mono bg-border-subtle px-2 py-0.5 rounded">{currentPatient?.id}</span>
                  <span>{currentPatient?.age} años</span>
                  <span>{currentPatient?.gender}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setAppState('WRITING')}
              className="w-full md:w-auto justify-center bg-olive text-bg-warm px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-olive/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nueva Sesión
            </button>
          </header>

          <div className="space-y-8">
            <h2 className="text-sm font-mono uppercase tracking-widest text-ink/40 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Historial de Tratamiento
            </h2>
            
            {patientSessions.length === 0 ? (
              <div className="bg-white/40 border border-border-subtle rounded-2xl p-12 text-center">
                <p className="text-ink/40 font-serif text-lg italic">No hay sesiones registradas para este paciente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {patientSessions.map(session => (
                  <div key={session.id} className="bg-white/60 border border-border-subtle p-6 md:p-8 rounded-2xl">
                    <div className="flex justify-between items-start mb-6 border-b border-border-subtle pb-4">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-olive" />
                        Sesión del {new Date(session.date).toLocaleDateString()}
                      </h3>
                      <span className="text-xs font-mono text-ink/40">{new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="space-y-6">
                      {session.narrative && (
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-2">Narrativa del Paciente</h4>
                          <p className="text-sm md:text-base leading-relaxed text-ink/60 italic border-l-2 border-border-subtle pl-4">{session.narrative}</p>
                        </div>
                      )}
                      
                      {session.insight?.interpretation && (
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-2">Interpretación Clínica</h4>
                          <p className="text-sm md:text-base leading-relaxed text-ink/80 whitespace-pre-wrap">{session.insight.interpretation}</p>
                        </div>
                      )}
                      
                      {session.insight?.closure && (
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-2">Cierre y Reestructuración</h4>
                          <p className="text-sm md:text-base leading-relaxed text-ink/80 whitespace-pre-wrap">{session.insight.closure}</p>
                        </div>
                      )}

                      {!session.insight && session.extractedData && (
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-2">Hipótesis Inicial</h4>
                          <p className="text-sm md:text-base leading-relaxed text-ink/80">{session.extractedData.theory}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN CANVAS
  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-bg-warm text-ink">
      
      {/* LEFT PANEL: The Canvas */}
      <motion.div 
        className="flex-1 flex flex-col relative"
        animate={{ 
          width: appState === 'INSIGHT_READY' ? '0%' : (isMobile ? '100%' : '60%'),
          opacity: appState === 'INSIGHT_READY' ? 0 : 1
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: appState === 'INSIGHT_READY' ? 'none' : 'flex' }}
      >
        <div className="p-6 md:p-12 flex-1 flex flex-col max-w-4xl mx-auto w-full relative">
          <header className="mb-6 md:mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => setAppState('PATIENT_HISTORY')} className="p-1.5 hover:bg-ink/5 rounded-full transition-colors mr-1">
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-ink/60" />
              </button>
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-olive hidden md:block" />
              <h1 className="text-lg md:text-xl font-serif font-medium tracking-wide text-olive">First Step</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-none">{currentPatient?.name}</span>
              <span className="text-[10px] md:text-xs font-mono uppercase tracking-widest bg-border-subtle px-2 py-1 rounded text-ink/60">{currentPatient?.id}</span>
            </div>
          </header>

          <AnimatePresence>
            {validationFeedback && appState === 'WRITING' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 md:mb-6 bg-terracotta/10 border border-terracotta/20 text-terracotta p-3 md:p-4 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm leading-relaxed">{validationFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 overflow-y-auto pb-24 md:pb-32">
              {narrativeBlocks.map((block, i) => (
                <p key={i} className="text-lg md:text-2xl leading-relaxed font-sans mb-4 md:mb-6 text-ink/80 whitespace-pre-wrap">
                  {block}
                </p>
              ))}
              
              <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  if (validationFeedback) setValidationFeedback(null); // Clear feedback on type
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder={narrativeBlocks.length === 0 ? "¿Qué te trae por aquí hoy? Escribe libremente sobre tus conflictos, cómo te sientes y cualquier recuerdo del pasado que venga a tu mente..." : "Continúa escribiendo aquí..."}
                className="w-full bg-transparent resize-none outline-none text-lg md:text-2xl leading-relaxed font-sans placeholder:text-ink/20 overflow-hidden min-h-[120px] md:min-h-[150px]"
                readOnly={appState !== 'WRITING'}
              />
            </div>
            
            {/* Action Bar */}
            <AnimatePresence>
              {appState === 'WRITING' && currentInput.trim().length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center pointer-events-none"
                >
                  <button 
                    onClick={handleExtract}
                    className="pointer-events-auto bg-ink text-bg-warm px-5 py-2.5 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium flex items-center gap-2 hover:bg-ink/80 transition-colors shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    Estructurar Narrativa
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL: The Mirror / Insight */}
      <motion.div 
        className="flex-1 md:h-full bg-bg-panel border-t md:border-t-0 md:border-l border-border-subtle flex flex-col overflow-y-auto"
        animate={{ 
          width: appState === 'INSIGHT_READY' ? '100%' : (isMobile ? '100%' : '40%'),
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: (appState === 'WRITING' && isMobile) ? 'none' : 'flex' }}
      >
        <div className="p-6 md:p-12 max-w-3xl mx-auto w-full h-full flex flex-col">
          
          <AnimatePresence mode="wait">
            {/* STATE: Empty / Waiting */}
            {(appState === 'WRITING' || appState === 'EXTRACTING') && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center opacity-50"
              >
                {appState === 'EXTRACTING' ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-olive mb-4" />
                    <p className="font-mono text-sm uppercase tracking-widest text-olive">Analizando Patrones...</p>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-8 h-8 text-ink/20 mb-4" />
                    <p className="font-serif text-lg text-ink/40 italic">El espejo clínico estructurará tu relato aquí.</p>
                  </>
                )}
              </motion.div>
            )}

            {/* STATE: Structured Data */}
            {(appState === 'STRUCTURED' || appState === 'GENERATING_INSIGHT') && extractedData && (
              <motion.div 
                key="structured"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-8">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-olive mb-3">Marco Teórico Detectado</h3>
                  <div className="bg-white/50 border border-border-subtle px-4 py-3 rounded-lg text-sm font-medium">
                    {extractedData.theory}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-olive mb-3">Conflictos Centrales</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.conflicts.map((c, i) => (
                      <span key={i} className="bg-terracotta/10 text-terracotta border border-terracotta/20 px-3 py-1 rounded-full text-sm">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-olive mb-3">Recuerdos Extraídos ({extractedData.memories.length})</h3>
                  <div className="space-y-3">
                    {extractedData.memories.map((m, i) => (
                      <div key={i} className="bg-white/50 border border-border-subtle p-4 rounded-xl">
                        <p className="text-sm mb-3 leading-relaxed">{m.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-ink/40 mb-1 font-mono uppercase">Sintió</span>
                            <span className="font-medium">{m.feelingThen}</span>
                          </div>
                          <div>
                            <span className="block text-ink/40 mb-1 font-mono uppercase">Siente</span>
                            <span className="font-medium">{m.feelingNow}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unmapped Phrases Section */}
                {extractedData.unmappedPhrases && extractedData.unmappedPhrases.length > 0 && (
                  <div className="mb-8 flex-1">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Notas Adicionales (No Relacionados)
                    </h3>
                    <ul className="space-y-2">
                      {extractedData.unmappedPhrases.map((phrase, i) => (
                        <li key={i} className="text-xs text-ink/50 italic border-l-2 border-border-subtle pl-3 py-1">
                          "{phrase}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={handleGenerateInsight}
                  disabled={appState === 'GENERATING_INSIGHT'}
                  className="w-full bg-olive text-bg-warm px-6 py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-olive/90 transition-colors disabled:opacity-50 mt-auto shadow-md"
                >
                  {appState === 'GENERATING_INSIGHT' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generando Interpretación...</>
                  ) : (
                    <>Generar Interpretación Profunda <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            )}

            {/* STATE: Final Insight */}
            {(appState === 'INSIGHT_READY' || appState === 'REFINING_INSIGHT') && insight && (
              <motion.div 
                key="insight"
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-6 md:py-12 px-4 md:px-0"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-16 gap-6">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Brain className="w-5 h-5 md:w-6 md:h-6 text-olive" />
                    <h1 className="text-lg md:text-xl font-serif font-medium tracking-wide text-olive">First Step</h1>
                  </div>
                  <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto">
                    <button onClick={handleDiscardSession} className="flex-1 md:flex-none justify-center text-xs font-mono uppercase tracking-widest text-ink/40 hover:text-ink flex items-center gap-2 transition-colors border border-border-subtle md:border-none px-4 py-2 md:p-0 rounded-full md:rounded-none">
                      <RefreshCcw className="w-3 h-3" /> Descartar
                    </button>
                    <button onClick={handleSaveSession} className="flex-1 md:flex-none justify-center text-xs font-mono uppercase tracking-widest bg-olive text-bg-warm px-4 py-2 rounded-full hover:bg-olive/90 flex items-center gap-2 transition-colors shadow-sm">
                      <Save className="w-3 h-3" /> Guardar
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative">
                  <div className="flex justify-between items-center mb-6 md:mb-8 max-w-3xl mx-auto">
                    <h2 className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-olive">Interpretación Clínica</h2>
                    <button 
                      onClick={() => setIsEditingInsight(!isEditingInsight)}
                      className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-ink/60 hover:text-ink flex items-center gap-2 transition-colors"
                    >
                      {isEditingInsight ? <><Check className="w-3 h-3" /> Terminar</> : <><Edit2 className="w-3 h-3" /> Editar</>}
                    </button>
                  </div>

                  {isEditingInsight ? (
                    <textarea
                      value={insight.interpretation}
                      onChange={(e) => handleManualInsightChange('interpretation', e.target.value)}
                      className="w-full text-xl md:text-3xl lg:text-4xl font-serif leading-tight text-center mb-8 md:mb-16 max-w-3xl mx-auto block bg-white/50 border border-border-subtle rounded-xl p-4 md:p-6 outline-none focus:border-olive/50 resize-none min-h-[150px] md:min-h-[200px]"
                    />
                  ) : (
                    <p className="text-2xl md:text-4xl lg:text-5xl font-serif leading-tight text-center mb-8 md:mb-16 max-w-3xl mx-auto">
                      "{insight.interpretation}"
                    </p>
                  )}

                  <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-md border border-border-subtle p-6 md:p-8 rounded-2xl mb-8 md:mb-16 shadow-sm">
                    <h3 className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-terracotta mb-4">Reestructuración</h3>
                    {isEditingInsight ? (
                      <textarea
                        value={insight.closure}
                        onChange={(e) => handleManualInsightChange('closure', e.target.value)}
                        className="w-full text-base md:text-lg leading-relaxed bg-transparent border-b border-border-subtle outline-none focus:border-terracotta/50 resize-none min-h-[100px]"
                      />
                    ) : (
                      <p className="text-base md:text-lg leading-relaxed">
                        {insight.closure}
                      </p>
                    )}
                  </div>

                  {/* Refinement UI */}
                  <div className="max-w-2xl mx-auto mb-8 md:mb-16">
                    <div className="bg-white/40 border border-border-subtle rounded-xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                      <input
                        type="text"
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        placeholder="Ej. Hazlo más enfocado en su relación..."
                        className="flex-1 bg-transparent outline-none px-4 py-2 text-sm placeholder:text-ink/30"
                        onKeyDown={(e) => e.key === 'Enter' && handleRefineInsight()}
                        disabled={appState === 'REFINING_INSIGHT'}
                      />
                      <button
                        onClick={handleRefineInsight}
                        disabled={!refinementInput.trim() || appState === 'REFINING_INSIGHT'}
                        className="bg-ink text-bg-warm px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-ink/80 transition-colors disabled:opacity-50"
                      >
                        {appState === 'REFINING_INSIGHT' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Refinando...</>
                        ) : (
                          <><Wand2 className="w-4 h-4" /> Refinar con IA</>
                        )}
                      </button>
                    </div>
                  </div>

                  {insight.groundingUrls.length > 0 && (
                    <div className="max-w-2xl mx-auto border-t border-border-subtle pt-8">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Fundamentación Científica (Google Search)
                      </h3>
                      <ul className="space-y-2">
                        {insight.groundingUrls.map((url, i) => (
                          <li key={i}>
                            <a href={url.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-olive hover:underline flex items-center gap-2">
                              {url.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </motion.div>
    </div>
  );
}

