import { AiStudio } from '@/components/workspace/ai-studio';

export const metadata = {
  title: 'AI Gateway & Workspace | Kesit',
  description: 'Self-hosted Auth, Credit Ledger, Lemon Squeezy & OpenRouter Proxy',
};

export default function GatewayPage() {
  return (
    <main className="min-h-screen bg-cream py-8">
      <AiStudio />
    </main>
  );
}
