// utils/regionDetector.js
import { REGION_SUBJECTS, findRegionByName } from './regions';

/**
 * Определение региона через Nominatim API
 */
export async function detectRegionByCoordinatesAPI(lat, lng) {

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AgroApp/1.0'
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        const address = data.address;

        // Ищем регион в разных полях
        let regionName = address.state ||
            address.province ||
            address.region ||
            address.city ||
            address.town ||
            address.village ||
            address.county;

        if (!regionName) {
            return null;
        }

        // Пробуем найти регион по названию
        const regionId = findRegionByName(regionName);

        if (regionId) {

            // Ищем субъект, который соответствует найденному названию
            const subject = REGION_SUBJECTS.find(s =>
                s.regionId === regionId &&
                (s.name.toLowerCase().includes(regionName.toLowerCase()) ||
                    regionName.toLowerCase().includes(s.name.toLowerCase()))
            );

            // Если не нашли точное совпадение, берём первый субъект в регионе
            const finalSubject = subject || REGION_SUBJECTS.find(s => s.regionId === regionId);

            return {
                regionId: regionId,
                subjectId: finalSubject?.id || null,
                subjectName: finalSubject?.name || regionName
            };
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Определение региона и субъекта для поля
 */
export async function detectRegionForField(field) {

    const coords = field.plots?.[0]?.coordinates || field.coordinates;
    if (!coords || coords.length === 0) {
        return null;
    }

    // Находим центр полигона
    const center = coords.reduce((acc, [lat, lng]) => ({
        lat: acc.lat + lat / coords.length,
        lng: acc.lng + lng / coords.length
    }), { lat: 0, lng: 0 });

    const result = await detectRegionByCoordinatesAPI(center.lat, center.lng);

    return result;
}