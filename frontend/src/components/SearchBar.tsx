import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useMapFocus } from '@/contexts/MapFocusContext';
import { capitalizeWords } from '@/utils/textTransform';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import type { Usuario } from '@/types/usuario';

interface SearchBarProps {
  /** Callback cuando se selecciona un usuario. Si no se proporciona, usa focusOnUser por defecto */
  onSelectUser?: (usuario: Usuario) => void;
  /** Lista de IDs de usuarios a excluir de los resultados */
  excludeIds?: number[];
  /** Placeholder personalizado */
  placeholder?: string;
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

export function SearchBar({
  onSelectUser,
  excludeIds = [],
  placeholder = "Buscar usuario por ID, nombre o apellido...",
  className = ""
}: SearchBarProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { focusOnUser } = useMapFocus();
  const searchRef = useRef<HTMLDivElement>(null);

  // Obtener usuarios desde React Query cache
  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.getUsuarios(0, 1000),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Memoizar usuarios para evitar recalcular el filtro en cada render
  const usuarios = useMemo(() => usuariosData?.usuarios || [], [usuariosData?.usuarios]);

  // Filtrar usuarios
  const filteredUsuarios = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase().trim();

    return usuarios
      .filter((u) => !excludeIds.includes(u.id_usuario)) // Excluir IDs
      .filter((u) => {
        // Buscar por ID
        if (u.id_usuario.toString().includes(term)) return true;

        // Construir texto completo del usuario
        const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase();

        // Si el término está directamente incluido en el nombre completo
        if (fullName.includes(term)) return true;

        // Buscar palabra por palabra (permite escribir en cualquier orden)
        const searchWords = term.split(/\s+/).filter(word => word.length > 0);
        const allWordsMatch = searchWords.every(word => fullName.includes(word));

        return allWordsMatch;
      });
  }, [searchTerm, usuarios, excludeIds]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectUser = (usuario: Usuario) => {
    if (onSelectUser) {
      // Si se proporciona callback personalizado, usarlo
      onSelectUser(usuario);
    } else {
      // Si no, usar el comportamiento por defecto (enfocar en el mapa)
      focusOnUser(usuario.id_usuario);
    }
    setSearchTerm('');
    setShowResults(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className={`relative w-full max-w-md ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => searchTerm && setShowResults(true)}
          className="pl-10 pr-10 bg-white text-black placeholder:text-gray-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showResults && searchTerm && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.slice(0, 10).map((usuario) => (
              <button
                key={usuario.id_usuario}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b last:border-0 transition-colors"
                onClick={() => handleSelectUser(usuario)}
              >
                <p className="font-medium text-black">
                  {capitalizeWords(usuario.nombre)} {capitalizeWords(usuario.apellidos)}
                </p>
                <p className="text-sm text-gray-600">
                  ID: {usuario.id_usuario} • {usuario.edad} años
                  {usuario.hobby && ` • ${capitalizeWords(usuario.hobby.nombre)}`}
                </p>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No se encontraron usuarios</div>
          )}
        </div>
      )}
    </div>
  );
}
