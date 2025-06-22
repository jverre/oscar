export default function Home() {
  // Middleware handles redirect for authenticated users
  // This page only shows for unauthenticated users
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Oscar Chat</h1>
          <p className="text-muted-foreground">
            An IDE-inspired chat application powered by AI
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in to start chatting with OpenAI, Anthropic, and Google Gemini
          </p>
        </div>
      </div>
    </main>
  );
}