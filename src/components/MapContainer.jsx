/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function MapView({ children }) {
    return (
        <MapContainer
            center={[55.7558, 37.6173]}
            zoom={13}
            style={{ height: '100vh', width: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            {children}
        </MapContainer>
    );
}