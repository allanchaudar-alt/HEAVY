export type ExerciseCategory = string;

export const DEFAULT_CATEGORIES: ExerciseCategory[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Cardio',
  'Outros'
];

export const DEFAULT_EXERCISES: Record<string, string[]> = {
  'Peito': ['Supino Reto', 'Supino Inclinado', 'Crucifixo', 'Crossover', 'Flexão de Braços', 'Peck Deck'],
  'Costas': ['Puxada Aberta', 'Remada Curvada', 'Remada Baixa', 'Levantamento Terra', 'Barra Fixa', 'Pulldown'],
  'Pernas': ['Agachamento Livre', 'Leg Press 45', 'Extensora', 'Flexora', 'Afundo', 'Stiff', 'Elevação de Panturrilha'],
  'Ombros': ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Crucifixo Inverso', 'Encolhimento'],
  'Bíceps': ['Rosca Direta', 'Rosca Martelo', 'Rosca Concentrada', 'Rosca Scott'],
  'Tríceps': ['Tríceps Pulley', 'Tríceps Corda', 'Tríceps Testa', 'Mergulho (Dips)', 'Extensão Francesa'],
  'Abdômen': ['Abdominal Supra', 'Abdominal Infra', 'Prancha Isométrica', 'Abdominal Bicicleta'],
  'Cardio': ['Corrida', 'Ciclismo', 'Elíptico', 'Corda', 'Natação'],
  'Outros': ['Alongamento', 'Mobilidade', 'Aquecimento']
};

export interface LibraryExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  imageId?: string;
}
