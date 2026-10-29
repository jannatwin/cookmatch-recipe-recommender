export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-coral">CookMatch</p>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
        Find something delicious with what you have.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-8">
        The backend foundation is being set up. Add your Supabase credentials to connect the API.
      </p>
      <a
        className="mt-8 w-fit rounded-full bg-coral px-6 py-3 font-semibold text-cocoa shadow-clay transition hover:brightness-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa"
        href="/api/v1/health"
      >
        Check API health
      </a>
    </main>
  );
}
