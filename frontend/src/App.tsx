import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomePage } from "@/pages/HomePage";
import { Toaster } from "@/components/common/Toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-3">
          <h1 className="text-xl font-bold">PPA - Price Elasticity Simulator</h1>
          <p className="text-sm text-muted-foreground">
            Upload data, select SKU & parameters, and explore demand curves
          </p>
        </header>
        <HomePage />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
