import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '@/services/api';
import { getHobbyColor } from '@/utils/hobbyColors';
import type { Usuario } from '@/types/usuario';
import { EditUserDialog } from '@/components/EditUserDialog';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { ViewConnectionsDialog } from '@/components/ViewConnectionsDialog';
import { capitalizeWords } from '@/utils/textTransform';
import { useLoadingState } from '@/contexts/LoadingStateContext';
import { useShortestPath } from '@/contexts/ShortestPathContext';
import { useMapFocus } from '@/contexts/MapFocusContext';

interface UsuarioProperties {
  id: number;
  nombre: string;
  apellidos: string;
  edad: number;
  hobby: string;
  categoria: string;
  color: string;
}

interface ConexionProperties {
  id_origen: number;
  nombre_origen: string;
  id_destino: number;
  nombre_destino: string;
  tipo: 'Bidireccional' | 'Direccional';
}

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const shortestPathMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);

  const { loadingState, setLoadingState } = useLoadingState();
  const { shortestPathIds } = useShortestPath();
  const { focusedUserId, clearFocus } = useMapFocus();

  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewConnectionsDialogOpen, setViewConnectionsDialogOpen] = useState(false);

  // ================================
  // QUERIES
  // ================================
  const {
    data: usuariosData,
    isLoading: isLoadingUsuarios,
    error: errorUsuarios,
  } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.getUsuarios(0, 1000),
  });

  const {
    data: conexionesData,
    isLoading: isLoadingConexiones,
    error: errorConexiones,
  } = useQuery({
    queryKey: ['conexiones'],
    queryFn: () => api.getConexiones(),
  });

  const isFetchingUsuarios = useIsFetching({ queryKey: ['usuarios'] }) > 0;
  const isFetchingConexiones = useIsFetching({ queryKey: ['conexiones'] }) > 0;
  const isSynchronizing = isFetchingUsuarios || isFetchingConexiones;

  const isLoadingData = isLoadingUsuarios || isLoadingConexiones;
  const hasError = errorUsuarios || errorConexiones;
  const hasCompleteData = Boolean(usuariosData?.usuarios?.length && conexionesData?.conexiones);

  const usuariosRef = useRef<Usuario[]>([]);
  useEffect(() => {
    usuariosRef.current = usuariosData?.usuarios || [];
  }, [usuariosData?.usuarios]);

  // ================================
  // CONTROL DE ESTADO DE CARGA
  // ================================
  useEffect(() => {
    if (
      loadingState === 'loading' &&
      !isLoadingData &&
      hasCompleteData &&
      !hasError &&
      isMapReady
    ) {
      setLoadingState('ready');
    }
  }, [loadingState, isLoadingData, hasCompleteData, hasError, isMapReady, setLoadingState]);

  useEffect(() => {
    if (
      loadingState !== 'dismissed' &&
      sessionStorage.getItem('map-success-shown') === 'true' &&
      !isLoadingData &&
      hasCompleteData &&
      !hasError &&
      isMapReady
    ) {
      setLoadingState('dismissed');
    }
  }, [loadingState, isLoadingData, hasCompleteData, hasError, isMapReady, setLoadingState]);

  // ================================
  // INICIALIZAR MAPA
  // ================================
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      projection: 'globe',
      center: [0, 20],
      zoom: 1.8,
      minZoom: 1.5,
      maxZoom: 18,
      pitch: 0,
      maxPitch: 0,
      minPitch: 0,
      dragRotate: false,
      touchZoomRotate: false,
      fadeDuration: 0,
      renderWorldCopies: true,
      locale: {
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
      },
    });

    // Scroll más rápido
    mapInstance.scrollZoom.setWheelZoomRate(1 / 200);

    // Drag pan más directo
    mapInstance.dragPan.disable();
    mapInstance.dragPan.enable({
      linearity: 0.1,
      deceleration: 6000,
    });

    // Controles
    mapInstance.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: false,
        showCompass: false,
      }),
      'top-right'
    );

    // Etiquetas en español cuando existan
    mapInstance.on('style.load', () => {
      const layers = ['country-label', 'state-label', 'settlement-label', 'settlement-subdivision-label'];
      layers.forEach((layerId) => {
        try {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.setLayoutProperty(layerId, 'text-field', ['get', 'name_es']);
          }
        } catch {
          // ignorar si no existe
        }
      });
    });

    mapInstance.on('load', () => {
      setIsMapReady(true);
    });

    map.current = mapInstance;

    return () => {
      popupRef.current?.remove();
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // ================================
  // RENDER / UPDATE DEL GRAFO (NODOS + CONEXIONES)
  // ================================
  useEffect(() => {
    if (!isMapReady || !hasCompleteData || !map.current) return;

    const mapInstance = map.current;

    // ---------------------------
    // 1) NODOS (USUARIOS)
    // ---------------------------
    const geojsonUsuarios: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: usuariosData!.usuarios.map((usuario: Usuario) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [usuario.longitud, usuario.latitud],
        },
        properties: {
          id: usuario.id_usuario,
          nombre: capitalizeWords(usuario.nombre),
          apellidos: capitalizeWords(usuario.apellidos),
          edad: usuario.edad,
          hobby: usuario.hobby?.nombre || 'Sin hobby',
          categoria: usuario.hobby?.categoria.nombre || 'Sin categoría',
          color: getHobbyColor(usuario.hobby?.categoria.nombre),
        },
      })),
    };

    const sourceUsuarios = mapInstance.getSource('usuarios') as mapboxgl.GeoJSONSource | undefined;

    if (sourceUsuarios) {
      sourceUsuarios.setData(geojsonUsuarios);
    } else {
      mapInstance.addSource('usuarios', {
        type: 'geojson',
        data: geojsonUsuarios,
      });
    }

    if (!mapInstance.getLayer('usuarios-layer')) {
      mapInstance.addLayer({
        id: 'usuarios-layer',
        type: 'circle',
        source: 'usuarios',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 3, // zoom 1 = 3px
            5, 6, // zoom 5 = 6px
            10, 10, // zoom 10 = 10px
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      });

      // cursor y bandera para bloquear tooltips de conexiones
      mapInstance.on('mouseenter', 'usuarios-layer', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        isHoveringNode = true;
        // Remover tooltip de conexiones si está visible
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        conexionPopup.remove();
      });
      mapInstance.on('mouseleave', 'usuarios-layer', () => {
        mapInstance.getCanvas().style.cursor = '';
        isHoveringNode = false;
      });

      // click → popup con botones
      mapInstance.on('click', 'usuarios-layer', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties as UsuarioProperties;
        if (!props) return;

        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        const iniciales = `${props.nombre.charAt(0)}${props.apellidos.charAt(0)}`.toUpperCase();

        const popupContent = `
          <div style="
            position: relative;
            padding: 0;
            min-width: 240px;
            max-width: 240px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">
            <!-- Header -->
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px;
              background: linear-gradient(135deg, ${props.color}15 0%, ${props.color}05 100%);
              border-bottom: 1px solid #f0f0f0;
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${props.color};
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                flex-shrink: 0;
                box-shadow: 0 2px 6px ${props.color}40;
              ">
                ${iniciales}
              </div>

              <div style="flex: 1;">
                <div style="
                  display: inline-block;
                  background: rgba(0, 0, 0, 0.08);
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 11px;
                  color: #333;
                  font-weight: 600;
                  letter-spacing: 0.3px;
                  font-family: 'Courier New', monospace;
                ">
                  ID ${props.id}
                </div>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                <button
                  type="button"
                  class="edit-user-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                  "
                  title="Editar usuario"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="view-connections-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #22c55e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);
                  "
                  title="Ver conexiones"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="delete-user-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
                  "
                  title="Eliminar usuario"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Contenido -->
            <div style="padding: 12px;">
              <!-- Nombre -->
              <div style="margin-bottom: 10px;">
                <div style="font-size: 10px; color: #999; font-weight: 500; margin-bottom: 3px;">NOMBRE</div>
                <div style="font-size: 13px; font-weight: 600; color: #1a1a1a; text-transform: capitalize;">
                  ${props.nombre}
                </div>
              </div>

              <!-- Apellidos -->
              <div style="margin-bottom: 10px;">
                <div style="font-size: 10px; color: #999; font-weight: 500; margin-bottom: 3px;">APELLIDOS</div>
                <div style="font-size: 13px; font-weight: 600; color: #1a1a1a; text-transform: capitalize;">
                  ${props.apellidos}
                </div>
              </div>

              <!-- Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 9px; color: #999; font-weight: 500; margin-bottom: 3px;">EDAD</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1a1a1a;">
                    ${props.edad} años
                  </div>
                </div>
                <div>
                  <div style="font-size: 9px; color: #999; font-weight: 500; margin-bottom: 3px;">HOBBY</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1a1a1a; text-transform: capitalize;">
                    ${props.hobby}
                  </div>
                </div>
              </div>

              <!-- Categoría -->
              <div style="margin-bottom: 10px;">
                <div style="font-size: 10px; color: #999; font-weight: 500; margin-bottom: 4px;">CATEGORÍA</div>
                <div>
                  <span style="
                    display: inline-block;
                    padding: 4px 12px;
                    background: ${props.color};
                    color: white;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: capitalize;
                    box-shadow: 0 2px 4px ${props.color}40;
                  ">
                    ${props.categoria}
                  </span>
                </div>
              </div>

              <!-- Coordenadas -->
              <div style="padding-top: 10px; border-top: 1px solid #f0f0f0;">
                <div style="font-size: 10px; color: #999; font-weight: 500; margin-bottom: 5px;">COORDENADAS</div>
                <div style="
                  background: rgba(0, 0, 0, 0.04);
                  padding: 8px 12px;
                  border-radius: 8px;
                  border: 1px solid rgba(0, 0, 0, 0.08);
                  font-size: 12px;
                  color: #333;
                  font-family: 'Courier New', monospace;
                  font-weight: 600;
                  line-height: 1.5;
                ">
                  <div>Lat: ${coordinates[1].toFixed(4)}°</div>
                  <div>Lng: ${coordinates[0].toFixed(4)}°</div>
                </div>
              </div>
            </div>
          </div>
        `;

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: true,
          maxWidth: '240px',
          className: 'custom-popup',
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(mapInstance);

        setTimeout(() => {
          const usuario = usuariosRef.current.find(
            (u: Usuario) => u.id_usuario === props.id
          );
          if (!usuario) return;

          const popupElement = popupRef.current?.getElement();
          if (!popupElement) return;

          const editBtn = popupElement.querySelector('.edit-user-btn') as HTMLButtonElement | null;
          const viewBtn = popupElement.querySelector('.view-connections-btn') as HTMLButtonElement | null;
          const deleteBtn = popupElement.querySelector('.delete-user-btn') as HTMLButtonElement | null;

          if (editBtn) {
            editBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              setSelectedUser(usuario);
              setEditDialogOpen(true);
              popupRef.current?.remove();
            });
          }
          if (viewBtn) {
            viewBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              setSelectedUser(usuario);
              setViewConnectionsDialogOpen(true);
              popupRef.current?.remove();
            });
          }
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              setSelectedUser(usuario);
              setDeleteDialogOpen(true);
              popupRef.current?.remove();
            });
          }
        }, 50);
      });
    }

    // ---------------------------
    // 2) CONEXIONES
    // ---------------------------
    const usuariosMap = new window.Map<number, Usuario>(
      usuariosData!.usuarios.map((u: Usuario) => [u.id_usuario, u])
    );

    const conexionesMap = new window.Map<number, Set<number>>(
      conexionesData!.conexiones.map((c: { id_usuario: number; conexiones: number[] }) => [
        c.id_usuario,
        new Set(c.conexiones),
      ])
    );

    const todasLasLineas: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const procesadas = new Set<string>();

    conexionesData!.conexiones.forEach(
      ({ id_usuario, conexiones }: { id_usuario: number; conexiones: number[] }) => {
        const usuarioOrigen = usuariosMap.get(id_usuario);
        if (!usuarioOrigen) return;

        conexiones.forEach((idDestino) => {
          const usuarioDestino = usuariosMap.get(idDestino);
          if (!usuarioDestino) return;

          const key1 = `${id_usuario}-${idDestino}`;
          const key2 = `${idDestino}-${id_usuario}`;

          const conexionesDestino = conexionesMap.get(idDestino);
          const esBidireccional = conexionesDestino?.has(id_usuario) || false;

          if (esBidireccional) {
            if (!procesadas.has(key1) && !procesadas.has(key2)) {
              todasLasLineas.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [usuarioOrigen.longitud, usuarioOrigen.latitud],
                    [usuarioDestino.longitud, usuarioDestino.latitud],
                  ],
                },
                properties: {
                  id_origen: id_usuario,
                  nombre_origen: `${capitalizeWords(usuarioOrigen.nombre)} ${capitalizeWords(
                    usuarioOrigen.apellidos
                  )}`,
                  id_destino: idDestino,
                  nombre_destino: `${capitalizeWords(
                    usuarioDestino.nombre
                  )} ${capitalizeWords(usuarioDestino.apellidos)}`,
                  tipo: 'Bidireccional',
                },
              });
              procesadas.add(key1);
              procesadas.add(key2);
            }
          } else {
            if (!procesadas.has(key1)) {
              todasLasLineas.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [usuarioOrigen.longitud, usuarioOrigen.latitud],
                    [usuarioDestino.longitud, usuarioDestino.latitud],
                  ],
                },
                properties: {
                  id_origen: id_usuario,
                  nombre_origen: `${capitalizeWords(usuarioOrigen.nombre)} ${capitalizeWords(
                    usuarioOrigen.apellidos
                  )}`,
                  id_destino: idDestino,
                  nombre_destino: `${capitalizeWords(
                    usuarioDestino.nombre
                  )} ${capitalizeWords(usuarioDestino.apellidos)}`,
                  tipo: 'Direccional',
                },
              });
              procesadas.add(key1);
            }
          }
        });
      }
    );

    const geojsonConexiones: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: todasLasLineas,
    };

    const sourceConexiones = mapInstance.getSource('conexiones') as mapboxgl.GeoJSONSource | undefined;

    if (sourceConexiones) {
      sourceConexiones.setData(geojsonConexiones);
    } else {
      mapInstance.addSource('conexiones', {
        type: 'geojson',
        data: geojsonConexiones,
      });
    }

    // Capas invisibles más gruesas para mejorar el hover
    if (!mapInstance.getLayer('conexiones-bidireccionales-hover-area')) {
      mapInstance.addLayer(
        {
          id: 'conexiones-bidireccionales-hover-area',
          type: 'line',
          source: 'conexiones',
          filter: ['==', ['get', 'tipo'], 'Bidireccional'],
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#22c55e',
            'line-width': 10,
            'line-opacity': 0,
          },
        },
        'usuarios-layer'
      );
    }

    if (!mapInstance.getLayer('conexiones-direccionales-hover-area')) {
      mapInstance.addLayer(
        {
          id: 'conexiones-direccionales-hover-area',
          type: 'line',
          source: 'conexiones',
          filter: ['==', ['get', 'tipo'], 'Direccional'],
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 10,
            'line-opacity': 0,
          },
        },
        'usuarios-layer'
      );
    }

    // capa bidireccional visible (verde)
    if (!mapInstance.getLayer('conexiones-bidireccionales')) {
      mapInstance.addLayer(
        {
          id: 'conexiones-bidireccionales',
          type: 'line',
          source: 'conexiones',
          filter: ['==', ['get', 'tipo'], 'Bidireccional'],
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#22c55e',
            'line-width': 2,
            'line-opacity': 0.6,
          },
        },
        'usuarios-layer'
      );
    }

    // capa direccional visible (roja)
    if (!mapInstance.getLayer('conexiones-direccionales')) {
      mapInstance.addLayer(
        {
          id: 'conexiones-direccionales',
          type: 'line',
          source: 'conexiones',
          filter: ['==', ['get', 'tipo'], 'Direccional'],
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
            'line-opacity': 0.6,
          },
        },
        'usuarios-layer'
      );
    }

    // Tooltip conexiones (una sola instancia)
    const conexionPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '300px',
    });

    let tooltipTimeout: NodeJS.Timeout | null = null;
    let isMapInteracting = false; // Bandera para bloquear tooltips durante interacciones
    let isHoveringNode = false; // Bandera para detectar hover sobre usuarios

    // Remover tooltip y bloquear nuevos tooltips durante interacción
    const startMapInteraction = () => {
      isMapInteracting = true;
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      conexionPopup.remove();
    };

    // Permitir tooltips nuevamente después de la interacción
    const endMapInteraction = () => {
      setTimeout(() => {
        isMapInteracting = false;
      }, 100); // Pequeño delay para asegurar que termine la animación
    };

    // Bloquear tooltips durante interacción
    mapInstance.on('zoomstart', startMapInteraction);
    mapInstance.on('zoom', startMapInteraction);
    mapInstance.on('movestart', startMapInteraction);
    mapInstance.on('move', startMapInteraction);
    mapInstance.on('dragstart', startMapInteraction);
    mapInstance.on('drag', startMapInteraction);
    mapInstance.on('wheel', startMapInteraction);

    // Desbloquear tooltips cuando termina la interacción
    mapInstance.on('zoomend', endMapInteraction);
    mapInstance.on('moveend', endMapInteraction);
    mapInstance.on('dragend', endMapInteraction);
    mapInstance.on('idle', endMapInteraction);

    const attachConexionHandlers = (layerId: string) => {
      if (!mapInstance.getLayer(layerId)) return;

      // Para evitar duplicar handlers, primero quitamos posibles anteriores
      mapInstance.off('mousemove', layerId, () => {});
      mapInstance.off('mouseleave', layerId, () => {});

      mapInstance.on('mousemove', layerId, (e) => {
        // Bloquear tooltips si el mapa está en interacción o si está sobre un nodo
        if (isMapInteracting || isHoveringNode) {
          if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
          }
          return;
        }

        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as ConexionProperties;
        if (!props) return;

        // Verificar que las coordenadas estén dentro del globo terráqueo
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;

        // Normalizar longitud a rango -180 a 180
        const normalizedLng = ((lng + 180) % 360) - 180;

        // Validar que estén dentro de límites válidos del globo
        if (Math.abs(lat) > 85 || Math.abs(normalizedLng) > 180) {
          // Fuera del globo, no mostrar tooltip
          if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
          }
          conexionPopup.remove();
          return;
        }

        const color = props.tipo === 'Bidireccional' ? '#22c55e' : '#ef4444';

        const tooltipContent = `
          <div style="
            padding: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: white;
            border-radius: 8px;
          ">
            <div style="
              font-size: 13px;
              font-weight: 600;
              color: ${color};
              margin-bottom: 8px;
              text-align: center;
            ">
              ${props.tipo === 'Bidireccional' ? '↔' : '→'} Conexión ${props.tipo}
            </div>

            <div style="font-size: 12px; color: #333; margin-bottom: 4px;">
              <strong style="color: #666;">Origen:</strong> ${props.nombre_origen} (ID: ${props.id_origen})
            </div>

            <div style="font-size: 12px; color: #333;">
              <strong style="color: #666;">Destino:</strong> ${props.nombre_destino} (ID: ${props.id_destino})
            </div>
          </div>
        `;

        // Cancelar cualquier timeout previo
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
        }

        // Agregar popup oculto y mostrarlo después de posicionarse
        conexionPopup.setLngLat(e.lngLat).setHTML(tooltipContent);

        // Ocultar el popup antes de agregarlo
        const popupElement = conexionPopup.getElement();
        if (popupElement) {
          popupElement.style.opacity = '0';
        }

        conexionPopup.addTo(mapInstance);

        // Mostrar el popup después de que esté posicionado
        tooltipTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            const element = conexionPopup.getElement();
            if (element) {
              element.style.transition = 'opacity 0.15s ease-in-out';
              element.style.opacity = '1';
            }
          });
        }, 20);
      });

      mapInstance.on('mouseleave', layerId, () => {
        // Cancelar el timeout si el mouse sale antes de mostrar el tooltip
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        conexionPopup.remove();
      });
    };

    // Usar las capas de hover invisibles para mejor detección
    attachConexionHandlers('conexiones-bidireccionales-hover-area');
    attachConexionHandlers('conexiones-direccionales-hover-area');
  }, [isMapReady, hasCompleteData, usuariosData, conexionesData]);

  // ================================
  // SHORTEST PATH (ocultar conexiones mientras se muestra)
  // ================================
  useEffect(() => {
    if (!map.current || !isMapReady || !usuariosData?.usuarios) return;
    const mapInstance = map.current;

    // Si NO hay camino → limpiar y restaurar conexiones
    if (!shortestPathIds || shortestPathIds.length === 0) {
      shortestPathMarkersRef.current.forEach((m) => m.remove());
      shortestPathMarkersRef.current = [];

      if (mapInstance.getLayer('shortest-path-highlight')) {
        mapInstance.removeLayer('shortest-path-highlight');
      }
      if (mapInstance.getLayer('shortest-path-layer')) {
        mapInstance.removeLayer('shortest-path-layer');
      }
      if (mapInstance.getSource('shortest-path')) {
        mapInstance.removeSource('shortest-path');
      }

      // restaurar visibilidad de conexiones y usuarios
      if (mapInstance.getLayer('conexiones-bidireccionales')) {
        mapInstance.setLayoutProperty('conexiones-bidireccionales', 'visibility', 'visible');
      }
      if (mapInstance.getLayer('conexiones-direccionales')) {
        mapInstance.setLayoutProperty('conexiones-direccionales', 'visibility', 'visible');
      }
      if (mapInstance.getLayer('usuarios-layer')) {
        mapInstance.setLayoutProperty('usuarios-layer', 'visibility', 'visible');
      }
      return;
    }

    // Hay shortest path → construir ruta
    const usuariosMap = new window.Map<number, Usuario>(
      usuariosData.usuarios.map((u: Usuario) => [u.id_usuario, u])
    );

    const pathUsuarios = shortestPathIds
      .map((id) => usuariosMap.get(id))
      .filter(Boolean) as Usuario[];

    if (pathUsuarios.length < 2) return;

    const pathLines: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    for (let i = 0; i < pathUsuarios.length - 1; i++) {
      const origen = pathUsuarios[i];
      const destino = pathUsuarios[i + 1];

      pathLines.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [origen.longitud, origen.latitud],
            [destino.longitud, destino.latitud],
          ],
        },
        properties: {
          id_origen: origen.id_usuario,
          id_destino: destino.id_usuario,
          step: i + 1,
        },
      });
    }

    const geojsonPath = {
      type: 'FeatureCollection' as const,
      features: pathLines,
    };

    const sourcePath = mapInstance.getSource('shortest-path') as mapboxgl.GeoJSONSource | undefined;
    if (sourcePath) {
      sourcePath.setData(geojsonPath);
    } else {
      mapInstance.addSource('shortest-path', {
        type: 'geojson',
        data: geojsonPath,
      });
    }

    if (!mapInstance.getLayer('shortest-path-highlight')) {
      mapInstance.addLayer({
        id: 'shortest-path-highlight',
        type: 'line',
        source: 'shortest-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#fbbf24',
          'line-width': 6,
          'line-opacity': 0.4,
        },
      });
    }

    if (!mapInstance.getLayer('shortest-path-layer')) {
      mapInstance.addLayer({
        id: 'shortest-path-layer',
        type: 'line',
        source: 'shortest-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      });
    }

    // 🔥 Ocultar todas las conexiones y usuarios mientras se ve el camino más corto
    if (mapInstance.getLayer('conexiones-bidireccionales')) {
      mapInstance.setLayoutProperty('conexiones-bidireccionales', 'visibility', 'none');
    }
    if (mapInstance.getLayer('conexiones-direccionales')) {
      mapInstance.setLayoutProperty('conexiones-direccionales', 'visibility', 'none');
    }
    if (mapInstance.getLayer('usuarios-layer')) {
      mapInstance.setLayoutProperty('usuarios-layer', 'visibility', 'none');
    }

    // Estrellitas
    shortestPathMarkersRef.current.forEach((m) => m.remove());
    shortestPathMarkersRef.current = [];

    pathUsuarios.forEach((usuario, index) => {
      let label: string;
      let fillColor: string;

      if (index === 0) {
        label = 'I';
        fillColor = '#22c55e'; // Verde para inicio
      } else if (index === pathUsuarios.length - 1) {
        label = 'F';
        fillColor = '#ef4444'; // Rojo para final
      } else {
        label = String(index + 1); // Empezar desde 2 para los intermedios
        fillColor = '#f59e0b'; // Naranja para intermedios
      }

      const el = document.createElement('div');
      el.className = 'shortest-path-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" style="
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="${fillColor}"
              stroke="#ffffff"
              stroke-width="1.5"/>
          </svg>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
            font-weight: bold;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
          ">${label}</div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([usuario.longitud, usuario.latitud])
        .addTo(mapInstance);

      shortestPathMarkersRef.current.push(marker);

      // Agregar event listener para mostrar popup al hacer click
      const markerElement = marker.getElement();
      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();

        const hobbyColor = getHobbyColor(usuario.hobby?.categoria?.nombre || '');
        const coordinates: [number, number] = [usuario.longitud, usuario.latitud];
        const iniciales = `${capitalizeWords(usuario.nombre).charAt(0)}${capitalizeWords(usuario.apellidos).charAt(0)}`.toUpperCase();

        const popupContent = `
          <div style="
            position: relative;
            padding: 0;
            min-width: 240px;
            max-width: 240px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">
            <!-- Header -->
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px;
              background: linear-gradient(135deg, ${hobbyColor}15 0%, ${hobbyColor}05 100%);
              border-bottom: 1px solid #f0f0f0;
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${hobbyColor};
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                flex-shrink: 0;
                box-shadow: 0 2px 6px ${hobbyColor}40;
              ">
                ${iniciales}
              </div>

              <div style="flex: 1;">
                <div style="
                  display: inline-block;
                  background: rgba(0, 0, 0, 0.08);
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 11px;
                  color: #333;
                  font-weight: 600;
                  letter-spacing: 0.3px;
                  font-family: 'Courier New', monospace;
                ">
                  ID ${usuario.id_usuario}
                </div>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                <button
                  type="button"
                  class="edit-user-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                  "
                  title="Editar usuario"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="view-connections-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #22c55e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);
                  "
                  title="Ver conexiones"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="delete-user-btn"
                  style="
                    width: 32px;
                    height: 32px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
                  "
                  title="Eliminar usuario"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Contenido -->
            <div style="padding: 14px;">
              <div style="margin-bottom: 14px;">
                <div style="font-size: 15px; font-weight: 600; color: #111; margin-bottom: 4px;">
                  ${capitalizeWords(usuario.nombre)} ${capitalizeWords(usuario.apellidos)}
                </div>
                <div style="font-size: 12px; color: #666;">
                  ${usuario.edad} años
                </div>
              </div>

              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: linear-gradient(135deg, ${hobbyColor}10 0%, ${hobbyColor}05 100%);
                border-radius: 8px;
                border: 1px solid ${hobbyColor}20;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: ${hobbyColor};
                  flex-shrink: 0;
                  box-shadow: 0 0 0 3px ${hobbyColor}20;
                "></div>
                <div style="flex: 1;">
                  <div style="font-size: 13px; font-weight: 600; color: #333; margin-bottom: 2px;">
                    ${usuario.hobby ? capitalizeWords(usuario.hobby.nombre) : 'Sin hobby'}
                  </div>
                  <div style="font-size: 11px; color: #666;">
                    ${usuario.hobby?.categoria ? capitalizeWords(usuario.hobby.categoria.nombre) : 'Sin categoría'}
                  </div>
                </div>
              </div>

              <div style="
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #f0f0f0;
                font-size: 11px;
                color: #999;
                display: flex;
                gap: 12px;
              ">
                <div>Lat: ${coordinates[1].toFixed(4)}°</div>
                <div>Lng: ${coordinates[0].toFixed(4)}°</div>
              </div>
            </div>
          </div>
        `;

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: true,
          maxWidth: '240px',
          className: 'custom-popup',
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(mapInstance);

        // Agregar event listeners a los botones del popup
        setTimeout(() => {
          const popupEl = popupRef.current?.getElement();
          if (!popupEl) return;

          const editBtn = popupEl.querySelector('.edit-user-btn');
          const viewBtn = popupEl.querySelector('.view-connections-btn');
          const deleteBtn = popupEl.querySelector('.delete-user-btn');

          if (editBtn) {
            editBtn.addEventListener('click', () => {
              setSelectedUser(usuario);
              setEditDialogOpen(true);
              popupRef.current?.remove();
            });
          }

          if (viewBtn) {
            viewBtn.addEventListener('click', () => {
              setSelectedUser(usuario);
              setViewConnectionsDialogOpen(true);
              popupRef.current?.remove();
            });
          }

          if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
              setSelectedUser(usuario);
              setDeleteDialogOpen(true);
              popupRef.current?.remove();
            });
          }
        }, 0);
      });
    });

    // fit bounds
    const coords = pathUsuarios.map(
      (u) => [u.longitud, u.latitud] as [number, number]
    );
    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );

    mapInstance.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      duration: 1000,
    });
  }, [shortestPathIds, isMapReady, usuariosData?.usuarios]);

  // ================================
  // ENFOCAR USUARIO DESDE BÚSQUEDA
  // ================================
  useEffect(() => {
    if (!map.current || !isMapReady || !usuariosData?.usuarios || !focusedUserId) return;

    const mapInstance = map.current;
    const usuario = usuariosData.usuarios.find(
      (u: Usuario) => u.id_usuario === focusedUserId
    );

    if (!usuario) {
      clearFocus();
      return;
    }

    mapInstance.flyTo({
      center: [usuario.longitud, usuario.latitud],
      zoom: 8,
      duration: 2000,
      essential: true,
    });

    setTimeout(() => {
      clearFocus();
    }, 2000);
  }, [focusedUserId, isMapReady, usuariosData?.usuarios, clearFocus]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {isSynchronizing && loadingState === 'dismissed' && (
        <div className="absolute top-4 right-4 z-40 bg-white/90 text-gray-800 text-sm font-medium px-4 py-2 rounded-full shadow">
          Sincronizando grafo…
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {loadingState === 'ready' && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Grafo Social Listo!
                </h3>
                <p className="text-sm text-gray-600">
                  El mapa se ha cargado correctamente con todos los usuarios y
                  conexiones.
                </p>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    Usuarios ({usuariosData?.usuarios?.length || 0})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    Conexiones ({conexionesData?.stats?.total_conexiones || 0})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Mapa listo</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('map-success-shown', 'true');
                  setLoadingState('dismissed');
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Aceptar
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Esta pantalla solo aparece en la primera carga de la aplicación
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loadingState === 'loading' && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-6">
              {hasCompleteData && isMapReady ? (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Inicializando Grafo Social
                </h3>
                <p className="text-sm text-gray-600">
                  {hasCompleteData && isMapReady
                    ? 'El mapa se ha cargado correctamente con todos los usuarios y conexiones.'
                    : isLoadingData
                    ? 'Obteniendo usuarios y conexiones por primera vez...'
                    : !isMapReady
                    ? 'Preparando mapa...'
                    : 'Finalizando carga...'}
                </p>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      !isLoadingUsuarios ? 'bg-green-500' : 'bg-gray-300 animate-pulse'
                    }`}
                  >
                    {!isLoadingUsuarios && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">
                    Usuarios {!isLoadingUsuarios && `(${usuariosData?.usuarios?.length || 0})`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      !isLoadingConexiones ? 'bg-green-500' : 'bg-gray-300 animate-pulse'
                    }`}
                  >
                    {!isLoadingConexiones && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">
                    Conexiones{' '}
                    {!isLoadingConexiones && `(${conexionesData?.stats?.total_conexiones || 0})`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      isMapReady ? 'bg-green-500' : 'bg-gray-300 animate-pulse'
                    }`}
                  >
                    {isMapReady && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">
                    Mapa {isMapReady && 'listo'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Esta pantalla solo aparece en la primera carga de la aplicación
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Error al Cargar Datos
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  No se pudieron obtener los datos del grafo. Por favor verifica tu
                  conexión e intenta nuevamente.
                </p>
              </div>

              <div className="w-full space-y-2 bg-red-50 rounded-lg p-4 border border-red-200">
                {errorUsuarios && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 text-xs font-medium">Usuarios:</span>
                    <span className="text-red-700 text-xs flex-1">
                      {String(errorUsuarios.message || errorUsuarios)}
                    </span>
                  </div>
                )}
                {errorConexiones && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 text-xs font-medium">Conexiones:</span>
                    <span className="text-red-700 text-xs flex-1">
                      {String(errorConexiones.message || errorConexiones)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGOS */}
      {selectedUser && (
        <>
          <EditUserDialog
            usuario={selectedUser}
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) {
                setTimeout(() => setSelectedUser(null), 100);
              }
            }}
            onUserUpdated={(updatedUser) => setSelectedUser(updatedUser)}
          />
          <DeleteUserDialog
            usuario={selectedUser}
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) {
                setTimeout(() => setSelectedUser(null), 100);
              }
            }}
          />
          <ViewConnectionsDialog
            idUsuario={selectedUser.id_usuario}
            nombreUsuario={selectedUser.nombre}
            apellidoUsuario={selectedUser.apellidos}
            open={viewConnectionsDialogOpen}
            onOpenChange={(open) => {
              setViewConnectionsDialogOpen(open);
              if (!open) {
                setTimeout(() => setSelectedUser(null), 100);
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default Map;
