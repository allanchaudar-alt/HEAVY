/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Plus, 
  Calendar, 
  LayoutDashboard, 
  Dumbbell, 
  ChevronRight, 
  ChevronDown,
  Clock,
  Trash2, 
  X,
  History,
  TrendingUp,
  ArrowLeft,
  Search,
  Edit2,
  Camera,
  Download,
  Settings,
  RefreshCw,
  Upload,
  Info,
  BookOpen,
  PlusCircle,
  Check,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LibraryExercise, DEFAULT_CATEGORIES, ExerciseCategory, DEFAULT_EXERCISES } from './constants';
import { saveImage, getImage, getAllImageIds, deleteImage, getAllImages } from './lib/db';
import { processImage } from './lib/imageProcessor';

// --- Types ---

interface SetTemplate {
  reps: number;
  weight: number;
}

interface ExerciseTemplate {
  id: string;
  libraryId: string;
  name: string;
  description: string;
  image?: string; // Base64 or URL
  sets: SetTemplate[];
}

interface WorkoutTemplate {
  id: string;
  title: string;
  exercises: ExerciseTemplate[];
}

interface WorkoutLog {
  id: string;
  templateId: string;
  date: string;
  title: string;
  exercises: {
    libraryId: string;
    name: string;
    description: string;
    image?: string;
    completed: boolean;
    sets: SetTemplate[];
  }[];
}

type Tab = 'dashboard' | 'templates' | 'library' | 'history';

// --- Components ---

function CachedImage({ imageId, className }: { imageId?: string, className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    if (imageId) {
      if (imageId.startsWith('data:image')) {
        setSrc(imageId);
      } else {
        getImage(imageId).then(blob => {
          if (isMounted && blob) {
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          }
        });
      }
    } else {
      setSrc(null);
    }

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (src) {
    return <img src={src} className={className} alt="Exercise" referrerPolicy="no-referrer" />;
  }

  return (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <Dumbbell size={24} className="text-gray-300" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutLog | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState<ExerciseCategory[]>(DEFAULT_CATEGORIES);
  const [predefinedExercises, setPredefinedExercises] = useState<Record<string, string[]>>(DEFAULT_EXERCISES);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Load data from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('aura_templates');
    const savedHistory = localStorage.getItem('aura_history');
    const savedLibrary = localStorage.getItem('aura_library');
    const savedCategories = localStorage.getItem('aura_categories');
    const savedPredefined = localStorage.getItem('aura_predefined');
    
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedLibrary) setLibrary(JSON.parse(savedLibrary));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    if (savedPredefined) setPredefinedExercises(JSON.parse(savedPredefined));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('aura_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('aura_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('aura_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem('aura_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('aura_predefined', JSON.stringify(predefinedExercises));
  }, [predefinedExercises]);

  const addTemplate = (template: WorkoutTemplate) => {
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? template : t));
    } else {
      setTemplates([template, ...templates]);
    }
    setIsAddingTemplate(false);
    setEditingTemplate(null);
  };

  const editTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setIsAddingTemplate(true);
  };

  const deleteTemplate = (id: string) => {
    askConfirmation(
      'Excluir Treino',
      'Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.',
      () => setTemplates(templates.filter(t => t.id !== id))
    );
  };

  const startWorkout = (template: WorkoutTemplate) => {
    const newSession: WorkoutLog = {
      id: Date.now().toString(),
      templateId: template.id,
      date: new Date().toISOString(),
      title: template.title,
      exercises: template.exercises.map(ex => {
        return { 
          libraryId: ex.libraryId,
          name: ex.name, 
          description: ex.description,
          image: ex.image,
          completed: false,
          sets: [...ex.sets]
        };
      })
    };
    setActiveSession(newSession);
  };

  const finishWorkout = (session: WorkoutLog) => {
    setHistory([session, ...history]);
    setActiveSession(null);
    setActiveTab('dashboard');
  };

  const exportBackup = async () => {
    const images = await getAllImages();
    const imageMap: Record<string, string> = {};

    // Convert Blobs to Base64 for JSON export
    for (const { id, blob } of images) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      imageMap[id] = base64;
    }

    const backupData = {
      templates,
      history,
      library,
      images: imageMap,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muscle_app_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const performGarbageCollection = async () => {
    const usedImageIds = new Set<string>();

    // Scan library
    library.forEach(lib => {
      if (lib.imageId && !lib.imageId.startsWith('data:')) usedImageIds.add(lib.imageId);
    });

    // Scan templates
    templates.forEach(t => {
      t.exercises.forEach(ex => {
        if (ex.image && !ex.image.startsWith('data:')) usedImageIds.add(ex.image);
      });
    });

    // Scan history
    history.forEach(h => {
      h.exercises.forEach(ex => {
        if (ex.image && !ex.image.startsWith('data:')) usedImageIds.add(ex.image);
      });
    });

    const allStoredIds = await getAllImageIds();
    let deletedCount = 0;

    for (const id of allStoredIds) {
      if (!usedImageIds.has(id)) {
        await deleteImage(id);
        deletedCount++;
      }
    }

    alert(`Limpeza concluída! ${deletedCount} imagens órfãs foram removidas.`);
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.templates || !data.history || !data.images || !data.library) {
        throw new Error('Formato de backup inválido.');
      }

      // Restore images to IndexedDB
      for (const [id, base64] of Object.entries(data.images as Record<string, string>)) {
        // Convert base64 back to blob
        const response = await fetch(base64);
        const blob = await response.blob();
        await saveImage(id, blob);
      }

      // Restore templates, history and library
      setTemplates(data.templates);
      setHistory(data.history);
      setLibrary(data.library);
      
      setIsSettingsOpen(false);
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Erro ao importar backup:', error);
    }
  };

  return (
    <div className="min-h-screen relative bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-10 flex flex-col items-center relative flex-shrink-0">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute right-6 top-10 transition-all active:scale-90 opacity-40 hover:opacity-100"
        >
          <Settings size={24} className="text-accent" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <Dumbbell size={30} className="text-accent" />
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter">HEAVY</h1>
            <p className="text-muted text-sm capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-tighter">Configurações</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/20 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <button 
                  onClick={exportBackup}
                  className="w-full flex items-center gap-4 p-4 bg-black/20 hover:bg-black/30 rounded-2xl transition-colors text-left border border-border/30"
                >
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <Download size={20} />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-tighter">Exportar Backup</p>
                    <p className="text-[10px] text-muted uppercase">Salvar treinos e fotos em JSON</p>
                  </div>
                </button>

                <label className="w-full flex items-center gap-4 p-4 bg-black/20 hover:bg-black/30 rounded-2xl transition-colors text-left cursor-pointer border border-border/30">
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-tighter">Importar Backup</p>
                    <p className="text-[10px] text-muted uppercase">Restaurar dados de um arquivo JSON</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={importBackup}
                  />
                </label>

                <button 
                  onClick={performGarbageCollection}
                  className="w-full flex items-center gap-4 p-4 bg-black/20 hover:bg-black/30 rounded-2xl transition-colors text-left border border-border/30"
                >
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-tighter">Limpeza de Dados</p>
                    <p className="text-[10px] text-muted uppercase">Remover fotos não utilizadas</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              templates={templates} 
              history={history}
              onNavigate={setActiveTab}
              onStartWorkout={startWorkout}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesView 
              templates={templates} 
              onAdd={() => {
                if (library.length === 0) {
                  alert('Cadastre exercícios na Biblioteca primeiro!');
                  setActiveTab('library');
                  return;
                }
                setEditingTemplate(null);
                setIsAddingTemplate(true);
              }}
              onEdit={editTemplate}
              onDelete={deleteTemplate}
              onStart={startWorkout}
            />
          )}
          {activeTab === 'library' && (
            <LibraryView 
              library={library}
              onUpdate={setLibrary}
              categories={categories}
              predefinedExercises={predefinedExercises}
              onUpdateCategories={setCategories}
              onUpdatePredefined={setPredefinedExercises}
              askConfirmation={askConfirmation}
            />
          )}
          {activeTab === 'history' && (
            <HistoryView 
              history={history}
              onDelete={(id) => askConfirmation(
                'Excluir Histórico',
                'Deseja remover este registro de treino do seu histórico?',
                () => setHistory(history.filter(h => h.id !== id))
              )}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none">
        <nav className="max-w-md mx-auto bg-surface/80 backdrop-blur-xl border border-border px-6 py-3 flex justify-around items-center rounded-[32px] shadow-2xl pointer-events-auto">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} />} 
            label="Início" 
          />
          <NavButton 
            active={activeTab === 'templates'} 
            onClick={() => setActiveTab('templates')} 
            icon={<PlusCircle size={20} />} 
            label="Treinos" 
          />
          <NavButton 
            active={activeTab === 'library'} 
            onClick={() => setActiveTab('library')} 
            icon={<BookOpen size={20} />} 
            label="Biblioteca" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History size={20} />} 
            label="Histórico" 
          />
        </nav>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingTemplate && (
          <WorkoutModal 
            onClose={() => {
              setIsAddingTemplate(false);
              setEditingTemplate(null);
            }} 
            onSave={addTemplate} 
            initialData={editingTemplate || undefined}
            library={library}
            categories={categories}
          />
        )}
        {activeSession && (
          <ExecutionModal 
            session={activeSession}
            onClose={() => setActiveSession(null)}
            onFinish={finishWorkout}
            onUpdateTemplate={(updatedTemplate) => {
              setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
            }}
            library={library}
            categories={categories}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-surface border-2 border-border w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={32} className="text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tighter">{title}</h3>
            <p className="text-muted text-sm">{message}</p>
          </div>
        </div>
        <div className="flex border-t border-border">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 font-black uppercase tracking-tighter hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 bg-destructive text-white font-black uppercase tracking-tighter hover:bg-destructive/90 transition-colors"
          >
            Excluir
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Sub-Views ---

function Dashboard({ templates, history, onNavigate, onStartWorkout }: { 
  templates: WorkoutTemplate[], 
  history: WorkoutLog[],
  onNavigate: (tab: Tab) => void,
  onStartWorkout: (t: WorkoutTemplate) => void
}) {
  const lastSession = history[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 flex items-center gap-3 h-14">
          <div className="bg-surface w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} className="text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{history.length}</p>
            <p className="text-[9px] text-muted font-black uppercase tracking-tighter">Sessões</p>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3 h-14">
          <div className="bg-surface w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell size={14} className="text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{templates.length}</p>
            <p className="text-[9px] text-muted font-black uppercase tracking-tighter">Treinos</p>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-black uppercase tracking-tighter">Iniciar Treino</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {templates.length > 0 ? (
            templates.map(t => (
              <button 
                key={t.id}
                onClick={() => onStartWorkout(t)}
                className="glass-card p-3 text-left hover:border-accent transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <Plus size={12} className="text-accent" />
                </div>
                <h3 className="font-bold text-xs truncate">{t.title}</h3>
                <p className="text-[9px] text-muted">{t.exercises.length} exercícios</p>
              </button>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-2">
              <button 
                onClick={() => onNavigate('templates')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Plus size={24} className="text-accent" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted">criar treino</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Last Session Section */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-black uppercase tracking-tighter">Última Atividade</h2>
        </div>
        {lastSession ? (
          <div className="glass-card p-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate leading-tight">{lastSession.title}</h3>
              <p className="text-muted text-[10px]">{new Date(lastSession.date).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {lastSession.exercises.slice(0, 2).map((ex, i) => (
                <span key={i} className="text-[8px] bg-surface px-1.5 py-0.5 rounded-full text-muted font-bold uppercase tracking-tighter">
                  {ex.name.split(' ')[0]}
                </span>
              ))}
              {lastSession.exercises.length > 2 && (
                <span className="text-[8px] text-muted">+{lastSession.exercises.length - 2}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted text-sm">Nenhuma atividade recente.</p>
        )}
      </section>
    </motion.div>
  );
}

function TemplatesView({ templates, onAdd, onEdit, onDelete, onStart }: { 
  templates: WorkoutTemplate[], 
  onAdd: () => void,
  onEdit: (t: WorkoutTemplate) => void,
  onDelete: (id: string) => void,
  onStart: (t: WorkoutTemplate) => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tighter">Meus Treinos</h2>
        <button onClick={onAdd} className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-lg shadow-accent/20">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {templates.length > 0 ? (
          templates.map(t => (
            <div key={t.id} className="glass-card p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    {t.exercises.slice(0, 3).map((ex, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-background overflow-hidden bg-surface shadow-sm">
                        <CachedImage imageId={ex.image} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{t.title}</h3>
                    <p className="text-muted text-[9px] uppercase font-bold tracking-widest">{t.exercises.length} exercícios</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => onEdit(t)}
                    className="p-1.5 text-muted hover:text-accent transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="p-1.5 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => onStart(t)}
                className="w-full py-1.5 bg-surface text-white rounded-lg text-[10px] font-bold hover:bg-surface/80 transition-all border border-white/10"
              >
                Iniciar Treino
              </button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <button 
              onClick={onAdd}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Plus size={32} className="text-accent" />
              </div>
              <span className="text-xs font-bold text-muted uppercase tracking-widest">criar treino</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LibraryView({ library, onUpdate, categories, predefinedExercises, onUpdateCategories, onUpdatePredefined, askConfirmation }: { 
  library: LibraryExercise[], 
  onUpdate: (l: LibraryExercise[]) => void,
  categories: ExerciseCategory[],
  predefinedExercises: Record<string, string[]>,
  onUpdateCategories: (c: ExerciseCategory[]) => void,
  onUpdatePredefined: (p: Record<string, string[]>) => void,
  askConfirmation: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>(categories[0]);
  const [description, setDescription] = useState('');
  const [imageId, setImageId] = useState<string | undefined>(undefined);
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category || categories[0]);
      setDescription(editing.description);
      setImageId(editing.imageId);
    } else {
      setName('');
      setCategory(categories[0]);
      setDescription('');
      setImageId(undefined);
    }
  }, [editing, isAdding, categories]);

  const handleSave = () => {
    if (!name || !category) return;
    
    if (editing) {
      onUpdate(library.map(ex => ex.id === editing.id ? { ...ex, name, category, description, imageId } : ex));
    } else {
      const newEx: LibraryExercise = {
        id: Date.now().toString(),
        name,
        category,
        description,
        imageId
      };
      onUpdate([newEx, ...library]);
    }

    // Add new category if it doesn't exist
    if (!categories.includes(category)) {
      onUpdateCategories([...categories, category]);
    }
    
    // Add new exercise to predefined if it doesn't exist
    const currentExs = predefinedExercises[category] || [];
    if (!currentExs.includes(name)) {
      onUpdatePredefined({
        ...predefinedExercises,
        [category]: [...currentExs, name]
      });
    }

    setIsAdding(false);
    setEditing(null);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const processedBlob = await processImage(file);
      const newImageId = `lib_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await saveImage(newImageId, processedBlob);
      setImageId(newImageId);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  const deleteExercise = (id: string) => {
    askConfirmation(
      'Excluir Exercício',
      'Tem certeza que deseja excluir este exercício da biblioteca?',
      () => onUpdate(library.filter(ex => ex.id !== id))
    );
  };

  const filteredLibrary = selectedFilter === 'Todos' 
    ? library 
    : library.filter(ex => ex.category === selectedFilter);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tighter">Biblioteca</h2>
        <button 
          onClick={() => setIsAdding(true)} 
          className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-lg shadow-accent/20"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-6 px-6">
        {['Todos', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat as any)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
              selectedFilter === cat 
                ? 'bg-accent text-black' 
                : 'bg-surface text-muted hover:bg-surface/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredLibrary.length > 0 ? (
          filteredLibrary.map(ex => (
            <div key={ex.id} className="glass-card p-2.5 flex gap-3 items-center">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-surface shadow-sm">
                <CachedImage imageId={ex.imageId} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-surface text-muted rounded-full">
                    {ex.category || 'Outros'}
                  </span>
                </div>
                <h3 className="font-bold text-sm leading-tight break-words">{ex.name}</h3>
                <p className="text-[10px] text-muted line-clamp-1">{ex.description || 'Sem descrição'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setEditing(ex)}
                  className="p-1.5 text-muted hover:text-accent transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => deleteExercise(ex.id)}
                  className="p-1.5 text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState 
            icon={<BookOpen size={48} />} 
            message="Sua biblioteca está vazia. Cadastre exercícios para usá-los nos seus treinos." 
            actionLabel="Cadastrar Exercício"
            onAction={() => setIsAdding(true)}
          />
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editing) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-surface w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col border-t border-border sm:border"
            >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tighter text-lg">{editing ? 'Editar Exercício' : 'Novo Exercício'}</h3>
          <button onClick={() => { setIsAdding(false); setEditing(null); }} className="p-2 hover:bg-surface rounded-full"><X size={20} /></button>
        </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center bg-surface">
                      {imageId ? (
                        <CachedImage imageId={imageId} className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={32} className="text-white/10" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/0 hover:bg-black/20 transition-colors rounded-3xl">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Nome</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ex: Supino Reto"
                      list="exercise-suggestions"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    <datalist id="exercise-suggestions">
                      {(predefinedExercises[category] || []).map(suggestion => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                    
                    {/* Sugestões baseadas na categoria */}
                    {predefinedExercises[category] && predefinedExercises[category].length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Sugestões para {category}</p>
                        <div className="flex flex-wrap gap-2">
                          {predefinedExercises[category].slice(0, 6).map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setName(suggestion)}
                              className="text-[10px] px-2 py-1 bg-surface hover:bg-surface/80 text-muted rounded-md transition-colors border border-border/30"
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Categoria</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ex: Peito, Pernas..."
                      list="category-suggestions"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    />
                    <datalist id="category-suggestions">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Explicação / Dicas</label>
                    <textarea 
                      className="input-field min-h-[120px] py-3 resize-none" 
                      placeholder="Como executar, postura, etc..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border">
                <button 
                  onClick={handleSave}
                  className="btn-primary w-full"
                  disabled={!name}
                >
                  Salvar na Biblioteca
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistoryView({ history, onDelete }: { 
  history: WorkoutLog[], 
  onDelete: (id: string) => void
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-black uppercase tracking-tighter">Histórico</h2>

      {/* Activity Chart */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted">Volume de Atividade</h2>
        </div>
        <ProgressChart history={history} />
      </section>

      <div className="space-y-4">
        {history.length > 0 ? (
          history.map(session => {
            const isExpanded = expandedIds.includes(session.id);
            return (
              <div key={session.id} className="glass-card overflow-hidden">
                <div 
                  onClick={() => toggleExpand(session.id)}
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-semibold text-lg leading-tight truncate">{session.title}</h3>
                    <div className="flex items-center text-muted text-[10px] mt-1 font-black uppercase tracking-tighter">
                      <Calendar size={10} className="mr-1" />
                      {new Date(session.date).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(session.id);
                      }}
                      className="text-muted hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted"
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
                        {session.exercises.map((ex, i) => (
                          <div key={i} className="bg-surface/50 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ex.completed ? 'bg-accent' : 'bg-white/10'}`} />
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border bg-surface shadow-sm">
                                <CachedImage imageId={ex.image} className="w-full h-full object-cover" />
                              </div>
                              <span className={`text-xs leading-tight font-bold uppercase tracking-tight ${ex.completed ? 'text-white' : 'text-muted line-through'}`}>
                                {ex.name}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-4.5">
                              {ex.sets.map((set, si) => (
                                <div key={si} className="text-[9px] bg-surface border border-border px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                                  <span className="text-muted">S{si+1}:</span> {set.reps} x {set.weight}kg
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <p className="text-center py-12 text-muted font-black uppercase tracking-tighter text-xs">Nenhum treino finalizado ainda.</p>
        )}
      </div>
    </motion.div>
  );
}

function ProgressChart({ history }: { history: WorkoutLog[] }) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');

  const data = useMemo(() => {
    const now = new Date();
    
    if (view === 'day') {
      // Last 7 days
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const count = history
          .filter(h => h.date.split('T')[0] === dateStr)
          .reduce((acc, h) => acc + h.exercises.filter(ex => ex.completed).length, 0);
        
        return {
          name: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', ''),
          value: count
        };
      });
    } else if (view === 'week') {
      // Last 4 weeks
      return Array.from({ length: 4 }).map((_, i) => {
        const start = new Date();
        start.setDate(now.getDate() - (3 - i) * 7 - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const count = history.filter(h => {
          const d = new Date(h.date);
          return d >= start && d <= end;
        }).reduce((acc, h) => acc + h.exercises.filter(ex => ex.completed).length, 0);

        return {
          name: `S${i + 1}`,
          value: count
        };
      });
    } else {
      // Last 6 months
      return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const month = d.getMonth();
        const year = d.getFullYear();
        
        const count = history.filter(h => {
          const hd = new Date(h.date);
          return hd.getMonth() === month && hd.getFullYear() === year;
        }).reduce((acc, h) => acc + h.exercises.filter(ex => ex.completed).length, 0);

        return {
          name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
          value: count
        };
      });
    }
  }, [history, view]);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              view === v ? 'bg-accent text-black' : 'bg-surface text-muted hover:bg-white/5'
            }`}
          >
            {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8E9299', fontSize: 10, fontWeight: 900 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8E9299', fontSize: 10, fontWeight: 900 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: '#3A4526', 
                border: '1px solid #4A5831',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase'
              }}
              itemStyle={{ color: '#A3E635' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#A3E635' : '#4A5831'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Modals ---

function WorkoutModal({ onClose, onSave, initialData, library, categories }: { 
  onClose: () => void, 
  onSave: (w: WorkoutTemplate) => void,
  initialData?: WorkoutTemplate,
  library: LibraryExercise[],
  categories: ExerciseCategory[]
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [exercises, setExercises] = useState<ExerciseTemplate[]>(
    initialData?.exercises || []
  );
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ExerciseCategory | 'Todos'>('Todos');

  const addExerciseFromLibrary = (libEx: LibraryExercise) => {
    const newEx: ExerciseTemplate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      libraryId: libEx.id,
      name: libEx.name,
      description: libEx.description,
      image: libEx.imageId,
      sets: [{ reps: 0, weight: 0 }]
    };
    setExercises([...exercises, newEx]);
    setIsSelectingExercise(false);
  };

  const addSet = (exId: string) => {
    setExercises(exercises.map(ex => ex.id === exId ? { ...ex, sets: [...ex.sets, { reps: 0, weight: 0 }] } : ex));
  };

  const updateSet = (exId: string, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const removeSet = (exId: string, setIndex: number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId && ex.sets.length > 1) {
        return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
      }
      return ex;
    }));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSave = () => {
    if (!title || exercises.length === 0) return;
    onSave({
      id: initialData?.id || Date.now().toString(),
      title,
      exercises
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-surface w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col border-t border-border sm:border"
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tighter text-lg">{initialData ? 'Editar Treino' : 'Criar Treino'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">Nome do Treino</label>
            <input 
              type="text" 
              placeholder="Ex: Treino A - Superior" 
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Exercícios</label>
            </div>
            
            {exercises.map((ex) => (
              <div key={ex.id} className="bg-surface rounded-2xl p-4 space-y-4 relative border border-border/50">
                <div className="flex justify-between items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border shadow-sm bg-surface">
                    <CachedImage imageId={ex.image} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm leading-tight break-words">{ex.name}</h4>
                    <p className="text-[10px] text-muted line-clamp-2">{ex.description}</p>
                  </div>
                  <button 
                    onClick={() => removeExercise(ex.id)}
                    className="text-muted hover:text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {ex.sets.map((set, si) => (
                    <div key={si} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted w-4">#{si+1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="flex items-center bg-surface border border-border rounded-lg px-2">
                          <input 
                            type="number" 
                            className="w-full py-1 text-sm focus:outline-none text-center bg-transparent text-white" 
                            placeholder="Reps"
                            value={set.reps || ''}
                            onChange={e => updateSet(ex.id, si, 'reps', parseInt(e.target.value) || 0)}
                          />
                          <span className="text-[8px] text-muted ml-1 uppercase">reps</span>
                        </div>
                        <div className="flex items-center bg-surface border border-border rounded-lg px-2">
                          <input 
                            type="number" 
                            className="w-full py-1 text-sm focus:outline-none text-center bg-transparent text-white" 
                            placeholder="Peso"
                            value={set.weight || ''}
                            onChange={e => updateSet(ex.id, si, 'weight', parseInt(e.target.value) || 0)}
                          />
                          <span className="text-[8px] text-muted ml-1 uppercase">kg</span>
                        </div>
                      </div>
                      {ex.sets.length > 1 && (
                        <button onClick={() => removeSet(ex.id, si)} className="text-muted hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => addSet(ex.id)}
                    className="text-[10px] text-accent font-bold uppercase mt-2 flex items-center"
                  >
                    <Plus size={12} className="mr-1" /> Adicionar série
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={() => setIsSelectingExercise(true)}
              className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-accent text-sm font-bold hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Escolher da Biblioteca
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <button 
            onClick={handleSave} 
            className="btn-primary w-full"
            disabled={!title || exercises.length === 0}
          >
            Salvar Treino
          </button>
        </div>

        {/* Exercise Selector Overlay */}
        <AnimatePresence>
          {isSelectingExercise && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-0 bg-background z-[120] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border flex items-center gap-4">
                <button onClick={() => setIsSelectingExercise(false)} className="p-2 hover:bg-surface rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-semibold text-lg">Escolher Exercício</h3>
              </div>
              
              <div className="px-6 py-2 border-b border-border flex gap-2 overflow-x-auto no-scrollbar">
                {['Todos', ...categories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFilter(cat as any)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                      selectedFilter === cat 
                        ? 'bg-accent text-black' 
                        : 'bg-surface text-muted hover:bg-surface/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                {(selectedFilter === 'Todos' ? library : library.filter(ex => ex.category === selectedFilter)).length > 0 ? (
                  (selectedFilter === 'Todos' ? library : library.filter(ex => ex.category === selectedFilter)).map(ex => (
                    <button 
                      key={ex.id}
                      onClick={() => addExerciseFromLibrary(ex)}
                      className="w-full flex items-center gap-4 p-3 bg-surface hover:bg-surface/80 rounded-2xl transition-colors text-left border border-border/30"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-surface">
                        <CachedImage imageId={ex.imageId} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">
                            {ex.category || 'Outros'}
                          </span>
                        </div>
                        <p className="font-bold text-sm leading-tight break-words">{ex.name}</p>
                        <p className="text-[10px] text-muted line-clamp-2">{ex.description}</p>
                      </div>
                      <Plus size={16} className="text-accent" />
                    </button>
                  ))
                ) : (
                  <p className="text-center py-12 text-muted">Nenhum exercício na biblioteca.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function ExecutionModal({ session, onClose, onFinish, onUpdateTemplate, library, categories }: { 
  session: WorkoutLog, 
  onClose: () => void, 
  onFinish: (s: WorkoutLog) => void,
  onUpdateTemplate: (w: WorkoutTemplate) => void,
  library: LibraryExercise[],
  categories: ExerciseCategory[]
}) {
  const [currentSession, setCurrentSession] = useState<WorkoutLog>(session);
  const [completedSets, setCompletedSets] = useState<boolean[][]>(
    session.exercises.map(ex => new Array(ex.sets.length).fill(false))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [infoExercise, setInfoExercise] = useState<LibraryExercise | null>(null);
  
  // Timer States
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const startTimer = (seconds: number = 60) => {
    if (!timerEnabled) return;
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };

  const adjustTimer = (seconds: number) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
  };

  const toggleSet = (exIndex: number, setIndex: number) => {
    const newCompletedSets = [...completedSets];
    newCompletedSets[exIndex] = [...newCompletedSets[exIndex]];
    const isNowCompleted = !newCompletedSets[exIndex][setIndex];
    newCompletedSets[exIndex][setIndex] = isNowCompleted;
    setCompletedSets(newCompletedSets);

    if (isNowCompleted && timerEnabled) {
      startTimer(60); // Default 60s rest
    }
  };

  const isExerciseCompleted = (exIndex: number) => {
    return completedSets[exIndex].every(val => val === true);
  };

  const handleFinishAttempt = () => {
    if (hasChanges) {
      setShowConfirmSave(true);
    } else {
      finalize(false);
    }
  };

  const finalize = (saveToTemplate: boolean) => {
    const finalSession = {
      ...currentSession,
      exercises: currentSession.exercises.map((ex, i) => ({
        ...ex,
        completed: isExerciseCompleted(i)
      }))
    };

    if (saveToTemplate) {
      onUpdateTemplate({
        id: currentSession.templateId,
        title: currentSession.title,
        exercises: currentSession.exercises.map((ex, i) => ({
          id: i.toString(),
          libraryId: ex.libraryId,
          name: ex.name,
          description: ex.description,
          image: ex.image,
          sets: ex.sets
        }))
      });
    }

    onFinish(finalSession);
  };

  const isFinished = completedSets.every((_, i) => isExerciseCompleted(i));

  const handleEditSave = (updated: WorkoutTemplate) => {
    const updatedSession: WorkoutLog = {
      ...currentSession,
      title: updated.title,
      exercises: updated.exercises.map((ex, i) => {
        const oldExIndex = currentSession.exercises.findIndex(oldEx => oldEx.name === ex.name);
        let newCompletedSetsForEx = new Array(ex.sets.length).fill(false);
        
        if (oldExIndex !== -1) {
          const oldCompleted = completedSets[oldExIndex];
          newCompletedSetsForEx = ex.sets.map((_, si) => {
            return si < oldCompleted.length ? oldCompleted[si] : false;
          });
        }

        return {
          libraryId: ex.libraryId,
          name: ex.name,
          description: ex.description,
          image: ex.image,
          completed: false,
          sets: ex.sets,
          _newCompletedSets: newCompletedSetsForEx
        };
      })
    };

    setCompletedSets(updatedSession.exercises.map(ex => (ex as any)._newCompletedSets));
    
    const cleanedExercises = updatedSession.exercises.map(ex => {
      const { _newCompletedSets, ...rest } = ex as any;
      return rest;
    });

    setCurrentSession({ ...updatedSession, exercises: cleanedExercises });
    setHasChanges(true);
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-[100] flex flex-col"
    >
      <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTimerEnabled(!timerEnabled)}
            className={`p-2 rounded-xl border transition-all ${timerEnabled ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-muted'}`}
            title={timerEnabled ? "Timer Ativado" : "Timer Desativado"}
          >
            <Clock size={18} />
          </button>
          <div>
            <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">{currentSession.title}</h3>
            <p className="text-[10px] text-muted uppercase font-black tracking-widest">Em execução</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-surface rounded-full text-muted hover:text-accent transition-colors"
          >
            <Edit2 size={20} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full"><X size={20} /></button>
        </div>
      </div>

      {/* Timer Overlay */}
      <AnimatePresence>
        {isTimerRunning && timeLeft > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-accent text-black overflow-hidden sticky top-[73px] z-20"
          >
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest leading-none">Descanso</span>
                  <span className="text-3xl font-black italic tabular-nums leading-none">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => adjustTimer(-15)}
                    className="px-2 py-1 bg-black/10 hover:bg-black/20 rounded font-black text-[10px] uppercase"
                  >
                    -15s
                  </button>
                  <button 
                    onClick={() => adjustTimer(15)}
                    className="px-2 py-1 bg-black/10 hover:bg-black/20 rounded font-black text-[10px] uppercase"
                  >
                    +15s
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setIsTimerRunning(false)}
                className="p-2 hover:bg-black/10 rounded-full"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <motion.div 
              className="h-1 bg-black/20 origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: timeLeft, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <div className="space-y-4">
          {currentSession.exercises.map((ex, i) => {
            const completed = isExerciseCompleted(i);
            const libEx = library.find(l => l.id === ex.libraryId);
            
            return (
              <div key={i} className={`rounded-2xl border transition-all overflow-hidden ${
                completed 
                  ? 'bg-surface border-white/10' 
                  : 'bg-surface border-border'
              }`}>
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => setZoomedImage(ex.image || null)}
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border shadow-md bg-background cursor-zoom-in"
                    >
                      <CachedImage imageId={ex.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-bold text-base leading-tight break-words ${completed ? 'line-through opacity-40' : ''}`}>
                          {ex.name}
                        </h4>
                        <button 
                          onClick={() => setInfoExercise(libEx || null)}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-muted hover:text-accent hover:bg-surface rounded-full transition-colors"
                        >
                          <Info size={18} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
                          completed ? 'bg-accent text-black' : 'bg-surface text-muted'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-[8px] font-bold text-muted uppercase tracking-widest">Exercício</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {ex.sets.map((set, si) => (
                      <button 
                        key={si} 
                        onClick={() => toggleSet(i, si)}
                        disabled={completed}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                          completedSets[i][si] 
                            ? 'bg-accent/10 border-accent' 
                            : 'bg-surface border-border hover:border-white/20'
                        } ${completed ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors flex-shrink-0 ${
                          completedSets[i][si] ? 'bg-accent text-black' : 'bg-white/10 text-muted'
                        }`}>
                          {si + 1}
                        </div>
                        
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-xl font-black tracking-tighter ${completedSets[i][si] ? 'text-accent' : 'text-ink'}`}>
                              {set.reps}
                            </span>
                            <span className="text-[10px] font-black text-muted uppercase">reps</span>
                          </div>
                          
                          {set.weight > 0 && (
                            <div className="flex items-baseline gap-1">
                              <span className={`text-xl font-black tracking-tighter ${completedSets[i][si] ? 'text-accent' : 'text-ink'}`}>
                                {set.weight}
                              </span>
                              <span className="text-[10px] font-black text-muted uppercase">kg</span>
                            </div>
                          )}
                        </div>

                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                          completedSets[i][si] ? 'bg-accent border-accent text-black scale-110' : 'border-white/10 text-transparent'
                        }`}>
                          <Check size={14} strokeWidth={4} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-background border-t border-border">
        <button 
          onClick={handleFinishAttempt} 
          className={`w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] ${
            isFinished 
              ? 'bg-accent text-black shadow-xl shadow-accent/20' 
              : 'bg-white/10 text-white'
          }`}
        >
          {isFinished ? 'Finalizar Treino' : 'Pausar / Finalizar'}
        </button>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="absolute inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-2xl aspect-square rounded-3xl overflow-hidden shadow-2xl"
            >
              <CachedImage imageId={zoomedImage} className="w-full h-full object-contain" />
            </motion.div>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2">
              <X size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {infoExercise && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-border"
            >
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-3 text-accent">
                  <Info size={24} />
                  <h3 className="text-xl font-black">Como executar</h3>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-lg">{infoExercise.name}</h4>
                  <p className="text-muted leading-relaxed">
                    {infoExercise.description || "Nenhuma instrução disponível para este exercício."}
                  </p>
                </div>
                <button 
                  onClick={() => setInfoExercise(null)}
                  className="w-full py-4 bg-surface rounded-2xl font-bold text-sm hover:bg-surface/80 transition-colors mt-4"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <WorkoutModal 
            library={library}
            onClose={() => setIsEditing(false)}
            onSave={handleEditSave}
            categories={categories}
            initialData={{
              id: currentSession.templateId,
              title: currentSession.title,
              exercises: currentSession.exercises.map((ex, i) => ({
                id: i.toString(),
                libraryId: ex.libraryId,
                name: ex.name,
                description: ex.description,
                image: ex.image,
                sets: ex.sets
              }))
            }}
          />
        )}

        {showConfirmSave && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-[32px] p-8 w-full max-w-sm text-center space-y-6 border border-border"
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <Edit2 size={32} className="text-accent" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold">Salvar alterações?</h4>
                <p className="text-muted text-sm">Você editou este treino durante a sessão. Deseja salvar estas mudanças no modelo original?</p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => finalize(true)}
                  className="w-full py-4 bg-accent text-black rounded-2xl font-bold shadow-lg shadow-accent/20"
                >
                  Sim, salvar no modelo
                </button>
                <button 
                  onClick={() => finalize(false)}
                  className="w-full py-4 bg-surface text-muted rounded-2xl font-bold"
                >
                  Não, apenas descartar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Helpers ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-accent' : 'text-muted hover:text-white/50'}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-surface' : ''}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-tighter transition-all ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}

function EmptyState({ icon, message, actionLabel, onAction }: { icon: React.ReactNode, message: string, actionLabel: string, onAction: () => void }) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center space-y-4">
      <div className="text-gray-200">{icon}</div>
      <p className="text-muted text-sm">{message}</p>
      <button onClick={onAction} className="text-accent font-semibold text-sm hover:underline">
        {actionLabel}
      </button>
    </div>
  );
}
