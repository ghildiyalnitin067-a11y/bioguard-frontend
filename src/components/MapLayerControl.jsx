import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import { TileLayer } from 'react-leaflet';

/* ── Tile layer presets ── */
export const MAP_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
    label: '🛰️ Satellite',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    label: '🛰️ + 🏷️ Hybrid',
    overlay: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.png',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    label: '🌑 Dark',
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
    label: '🗺️ Street',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: '🌿 Terrain',
  },
};

/* ── Hook: returns current TileLayer props ── */
export const useMapLayer = (defaultLayer = 'satellite') => {
  const [activeLayer, setActiveLayer] = useState(defaultLayer);
  return { activeLayer, setActiveLayer, layerConfig: MAP_LAYERS[activeLayer] };
};

/* ── Overlay component: sits on top of map ── */
export const MapLayerControl = ({ activeLayer, setActiveLayer }) => {
  return (
    <div className="map-layer-control" style={controlStyle}>
      {Object.entries(MAP_LAYERS).map(([key, { label }]) => (
        <button
          key={key}
          onClick={() => setActiveLayer(key)}
          style={{
            ...btnStyle,
            ...(activeLayer === key ? btnActiveStyle : {}),
          }}
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const controlStyle = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
const btnStyle = {
  padding: '6px 12px',
  background: 'rgba(20,32,24,0.92)',
  color: '#ccc',
  border: '1px solid rgba(134,239,172,0.15)',
  borderRadius: 8,
  fontSize: '0.74rem',
  fontWeight: 600,
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.2s',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};
const btnActiveStyle = {
  background: 'rgba(22,163,74,0.85)',
  color: '#fff',
  border: '1px solid rgba(134,239,172,0.5)',
};
