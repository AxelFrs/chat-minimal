import Chat from '@/components/Chat';

export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Effet de grille en arrière-plan */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      <div className="relative">
        {/* Header minimaliste */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Logo animé */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-md opacity-75 animate-pulse" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <h1 className="text-lg font-semibold text-white">Assistant IA</h1>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span>En ligne • Mode streaming</span>
                  </div>
                </div>
              </div>

              {/* Badge version */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs font-medium text-purple-300">v2.0</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Chat />
        </div>

        {/* Footer subtil */}
        <footer className="mt-12 pb-6 text-center">
          <p className="text-xs text-slate-500">
            Propulsé par Mistral AI • Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}