/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Calendar, 
  LayoutDashboard, 
  Dumbbell, 
  ChevronRight, 
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
    setTemplates(templates.filter(t => t.id !== id));
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
    <div className="min-h-screen max-w-md mx-auto relative pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic">HEAVY</h1>
          <p className="text-muted text-sm capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Settings size={20} className="text-gray-500" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Dumbbell size={20} className="text-accent" />
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
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Configurações</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <button 
                  onClick={exportBackup}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Download size={20} />
                  </div>
                  <div>
                    <p className="font-bold">Exportar Backup</p>
                    <p className="text-xs text-muted">Salvar treinos e fotos em JSON</p>
                  </div>
                </button>

                <label className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-left cursor-pointer">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="font-bold">Importar Backup</p>
                    <p className="text-xs text-muted">Restaurar dados de um arquivo JSON</p>
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
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <p className="font-bold">Limpeza de Dados</p>
                    <p className="text-xs text-muted">Remover fotos não utilizadas</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="px-6">
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
            />
          )}
          {activeTab === 'history' && (
            <HistoryView 
              history={history}
              onDelete={(id) => setHistory(history.filter(h => h.id !== id))}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/80 backdrop-blur-xl border-t border-border px-8 py-3 flex justify-around items-center z-50">
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
            <p className="text-[9px] text-muted font-black italic uppercase tracking-tighter">Sessões</p>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3 h-14">
          <div className="bg-surface w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell size={14} className="text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{templates.length}</p>
            <p className="text-[9px] text-muted font-black italic uppercase tracking-tighter">Treinos</p>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-black italic uppercase tracking-tighter">Iniciar Treino</h2>
          <button 
            onClick={() => onNavigate('templates')}
            className="text-accent text-[10px] font-black italic uppercase tracking-tighter flex items-center"
          >
            Gerenciar <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {templates.length > 0 ? (
            templates.map(t => (
              <button 
                key={t.id}
                onClick={() => onStartWorkout(t)}
                className="flex-shrink-0 w-32 glass-card p-3 text-left hover:border-accent transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <Plus size={12} className="text-accent" />
                </div>
                <h3 className="font-bold text-xs truncate">{t.title}</h3>
                <p className="text-[9px] text-muted">{t.exercises.length} exercícios</p>
              </button>
            ))
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-2">
              <button 
                onClick={() => onNavigate('templates')}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Plus size={16} className="text-accent" />
                </div>
                <span className="text-[8px] font-black italic uppercase tracking-tighter text-muted">criar treino</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Last Session Section */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-black italic uppercase tracking-tighter">Última Atividade</h2>
          <button 
            onClick={() => onNavigate('history')}
            className="text-accent text-[10px] font-black italic uppercase tracking-tighter flex items-center"
          >
            Histórico <ChevronRight size={12} />
          </button>
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
                <span className="text-[8px] text-muted italic">+{lastSession.exercises.length - 2}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted text-sm italic">Nenhuma atividade recente.</p>
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
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Meus Treinos</h2>
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

function LibraryView({ library, onUpdate, categories, predefinedExercises, onUpdateCategories, onUpdatePredefined }: { 
  library: LibraryExercise[], 
  onUpdate: (l: LibraryExercise[]) => void,
  categories: ExerciseCategory[],
  predefinedExercises: Record<string, string[]>,
  onUpdateCategories: (c: ExerciseCategory[]) => void,
  onUpdatePredefined: (p: Record<string, string[]>) => void
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
    if (confirm('Tem certeza que deseja excluir este exercício da biblioteca?')) {
      onUpdate(library.filter(ex => ex.id !== id));
    }
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
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Biblioteca</h2>
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-surface w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col border-t border-border sm:border"
            >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-black italic uppercase tracking-tighter text-lg">{editing ? 'Editar Exercício' : 'Novo Exercício'}</h3>
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
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-black italic uppercase tracking-tighter">Histórico</h2>

      <div className="space-y-4">
        {history.length > 0 ? (
          history.map(session => (
            <div key={session.id} className="glass-card p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg leading-tight break-words">{session.title}</h3>
                  <div className="flex items-center text-muted text-xs mt-1">
                    <Calendar size={12} className="mr-1" />
                    {new Date(session.date).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  onClick={() => onDelete(session.id)}
                  className="text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {session.exercises.map((ex, i) => (
                  <div key={i} className="bg-surface rounded-xl p-3">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${ex.completed ? 'bg-accent' : 'bg-white/10'}`} />
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-surface shadow-sm">
                        <CachedImage imageId={ex.image} className="w-full h-full object-cover" />
                      </div>
                      <span className={`text-sm leading-tight break-words ${ex.completed ? 'text-white font-medium' : 'text-muted line-through'}`}>{ex.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ex.sets.map((set, si) => (
                        <div key={si} className="text-[10px] bg-surface border border-border px-2 py-1 rounded-md whitespace-nowrap">
                          <span className="text-muted">S{si+1}:</span> {set.reps} x {set.weight}kg
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center py-12 text-muted italic">Nenhum treino finalizado ainda.</p>
        )}
      </div>
    </motion.div>
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
          <h3 className="font-black italic uppercase tracking-tighter text-lg">{initialData ? 'Editar Treino' : 'Criar Treino'}</h3>
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
                  <p className="text-center py-12 text-muted italic">Nenhum exercício na biblioteca.</p>
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

  const toggleSet = (exIndex: number, setIndex: number) => {
    const newCompletedSets = [...completedSets];
    newCompletedSets[exIndex] = [...newCompletedSets[exIndex]];
    newCompletedSets[exIndex][setIndex] = !newCompletedSets[exIndex][setIndex];
    setCompletedSets(newCompletedSets);
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
        <div>
          <h3 className="font-black italic uppercase tracking-tighter text-lg leading-tight">{currentSession.title}</h3>
          <p className="text-[10px] text-muted uppercase font-black italic tracking-widest">Em execução</p>
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
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                          completedSets[i][si] 
                            ? 'bg-accent/10 border-accent' 
                            : 'bg-surface border-border hover:border-white/20'
                        } ${completed ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                            completedSets[i][si] ? 'bg-accent text-black' : 'bg-white/10 text-muted'
                          }`}>
                            {si + 1}
                          </div>
                          <div className="text-left">
                            <p className={`font-bold text-sm leading-none ${completedSets[i][si] ? 'text-accent' : 'text-ink'}`}>
                              {set.reps} <span className="text-[9px] font-medium text-muted uppercase ml-0.5">reps</span>
                            </p>
                            <p className="text-[9px] text-muted font-medium mt-0.5">
                              Carga: {set.weight}kg
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          completedSets[i][si] ? 'bg-accent border-accent text-black scale-110' : 'border-white/10 text-transparent'
                        }`}>
                          <Check size={12} strokeWidth={3} />
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
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
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
      <span className={`text-[8px] font-black italic uppercase tracking-tighter transition-all ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
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
