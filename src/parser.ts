import ora from 'ora';

export interface ArchitectureSchema {
  name: string;
  framework: string;
  database?: string;
  styling?: string;
  auth?: string;
  ci?: string;
  features: string[];
}

// Simulated AI Parsing for 1.0 (In a real product, this would call Anthropic's Claude API)
export async function parsePromptToSchema(prompt: string): Promise<ArchitectureSchema> {
  const spinner = ora('AI is analyzing your architecture prompt...').start();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      spinner.succeed('Architecture analyzed successfully!');
      
      const lowerPrompt = prompt.toLowerCase();
      
      const schema: ArchitectureSchema = {
        name: 'my-auto-app',
        framework: 'Unknown',
        features: []
      };

      // Naive heuristic parsing for the demo
      if (lowerPrompt.includes('next.js') || lowerPrompt.includes('nextjs')) schema.framework = 'Next.js';
      else if (lowerPrompt.includes('react')) schema.framework = 'React (Vite)';
      else if (lowerPrompt.includes('vue')) schema.framework = 'Vue';
      
      if (lowerPrompt.includes('supabase')) schema.database = 'Supabase (PostgreSQL)';
      else if (lowerPrompt.includes('firebase')) schema.database = 'Firebase';
      else if (lowerPrompt.includes('mongo')) schema.database = 'MongoDB';

      if (lowerPrompt.includes('tailwind')) schema.styling = 'Tailwind CSS';
      if (lowerPrompt.includes('stripe')) schema.features.push('Stripe Billing');
      if (lowerPrompt.includes('github actions')) schema.ci = 'GitHub Actions';

      // Fallbacks
      if (!schema.framework) schema.framework = 'React (Vite)';
      if (!schema.styling) schema.styling = 'CSS Modules';
      
      resolve(schema);
    }, 1500);
  });
}
