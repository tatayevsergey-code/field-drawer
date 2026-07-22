import { useMapEvents, Polygon, Polyline, CircleMarker } from 'react-leaflet';
import { useState, useRef } from 'react';

export function DrawingLayer({ isDrawing, onPolygonComplete }) {
    const [points, setPoints] = useState([]);
    const clickTimer = useRef(null);

    useMapEvents({
        click(e) {
            if (!isDrawing) return;

            // Если таймер уже запущен — это второй клик в серии (двойной клик)
            // Отменяем обработку одиночного клика
            if (clickTimer.current) {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
                return;
            }

            // Запускаем таймер. Если за 250 мс не будет второго клика —
            // считаем это одиночным кликом и добавляем точку
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
            }, 250);
        },

        dblclick() {
            if (!isDrawing || points.length < 3) return;

            // Очищаем таймер одиночного клика, чтобы лишняя точка не добавилась
            if (clickTimer.current) {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
            }

            onPolygonComplete(points);
            setPoints([]);
        }
    });

    if (points.length === 0) return null;

    return (
        <>
            {points.map((p, i) => (
                <CircleMarker
                    key={i}
                    center={p}
                    radius={4}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 1 }}
                />
            ))}
            {points.length > 1 && (
                <Polyline positions={points} pathOptions={{ color: 'blue', dashArray: '5' }} />
            )}
            {points.length > 2 && (
                <Polygon
                    positions={points}
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                />
            )}
        </>
    );
}