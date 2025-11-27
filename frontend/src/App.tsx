import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ShortestPathProvider } from "@/contexts/ShortestPathContext";
import { MapFocusProvider } from "@/contexts/MapFocusContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Configuración de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutos
      gcTime: 1000 * 60 * 60 * 24, // 24 horas
    },
  },
});

// Crear persister para sessionStorage (asíncrono)
const sessionStoragePersister = createAsyncStoragePersister({
  storage: window.sessionStorage,
});

const App = () => {
  const [isRestored, setIsRestored] = useState(false);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: sessionStoragePersister }}
      onSuccess={() => setIsRestored(true)}
    >
      {isRestored && (
        <TooltipProvider>
          <ShortestPathProvider>
            <MapFocusProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </MapFocusProvider>
          </ShortestPathProvider>
        </TooltipProvider>
      )}
    </PersistQueryClientProvider>
  );
};

export default App;
