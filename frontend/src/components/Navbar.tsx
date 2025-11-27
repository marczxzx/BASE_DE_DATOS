import { CreateUserDialog } from './CreateUserDialog';
import { AddConnectionDialog } from './AddConnectionDialog';
import { ShortestPathDialog } from './ShortestPathDialog';
import { SearchBar } from './SearchBar';
import { useLoadingState } from '@/contexts/LoadingStateContext';
import { useShortestPath } from '@/contexts/ShortestPathContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const Navbar = () => {
  const { loadingState } = useLoadingState();
  const { shortestPathIds, clearShortestPath } = useShortestPath();
  const isDisabled = loadingState !== 'dismissed';

  return (
    <nav className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap">Social Graph Analyzer</h1>

          {/* Buscador */}
          <div className={`flex-1 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <SearchBar />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 flex-shrink-0">
            <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
              <AddConnectionDialog />
            </div>
            <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
              <ShortestPathDialog />
            </div>
            <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
              <CreateUserDialog />
            </div>
            {shortestPathIds && shortestPathIds.length > 0 && (
              <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
                <Button
                  onClick={clearShortestPath}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpiar Camino
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
