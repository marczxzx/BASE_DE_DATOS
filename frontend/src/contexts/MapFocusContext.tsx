import { createContext, useContext, useState, ReactNode } from 'react';

interface MapFocusContextType {
  focusedUserId: number | null;
  focusOnUser: (userId: number) => void;
  clearFocus: () => void;
}

const MapFocusContext = createContext<MapFocusContextType | undefined>(undefined);

export const MapFocusProvider = ({ children }: { children: ReactNode }) => {
  const [focusedUserId, setFocusedUserId] = useState<number | null>(null);

  const focusOnUser = (userId: number) => {
    setFocusedUserId(userId);
  };

  const clearFocus = () => {
    setFocusedUserId(null);
  };

  return (
    <MapFocusContext.Provider
      value={{
        focusedUserId,
        focusOnUser,
        clearFocus,
      }}
    >
      {children}
    </MapFocusContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMapFocus = () => {
  const context = useContext(MapFocusContext);
  if (context === undefined) {
    throw new Error('useMapFocus must be used within a MapFocusProvider');
  }
  return context;
};
