import { createContext, useContext, useState, ReactNode } from 'react';

type LoadingState = 'loading' | 'ready' | 'dismissed';

interface LoadingStateContextType {
  loadingState: LoadingState;
  setLoadingState: (state: LoadingState) => void;
}

const LoadingStateContext = createContext<LoadingStateContextType | undefined>(undefined);

export function LoadingStateProvider({ children }: { children: ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>(() => {
    const stored = sessionStorage.getItem('map-success-shown');
    return stored === 'true' ? 'dismissed' : 'loading';
  });

  return (
    <LoadingStateContext.Provider value={{ loadingState, setLoadingState }}>
      {children}
    </LoadingStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLoadingState() {
  const context = useContext(LoadingStateContext);
  if (context === undefined) {
    throw new Error('useLoadingState must be used within a LoadingStateProvider');
  }
  return context;
}
