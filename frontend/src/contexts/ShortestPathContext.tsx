import { createContext, useContext, useState, ReactNode } from 'react';

interface ShortestPathContextType {
  shortestPathIds: number[] | null;
  setShortestPathIds: (ids: number[] | null) => void;
  visualizeShortestPath: (ids: number[]) => void;
  clearShortestPath: () => void;
}

const ShortestPathContext = createContext<ShortestPathContextType | undefined>(undefined);

export const ShortestPathProvider = ({ children }: { children: ReactNode }) => {
  const [shortestPathIds, setShortestPathIds] = useState<number[] | null>(null);

  const visualizeShortestPath = (ids: number[]) => {
    setShortestPathIds(ids);
  };

  const clearShortestPath = () => {
    setShortestPathIds(null);
  };

  return (
    <ShortestPathContext.Provider
      value={{
        shortestPathIds,
        setShortestPathIds,
        visualizeShortestPath,
        clearShortestPath,
      }}
    >
      {children}
    </ShortestPathContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useShortestPath = () => {
  const context = useContext(ShortestPathContext);
  if (context === undefined) {
    throw new Error('useShortestPath must be used within a ShortestPathProvider');
  }
  return context;
};
