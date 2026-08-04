// utils/regionDetector.js
import { REGION_SUBJECTS, findRegionByName } from './regions';

/**
 * Определение региона через Nominatim API
 */
export async function detectRegionByCoordinatesAPI(lat, lng) {
    // console.log(`🔍 Определение региона по координатам: lat=${lat}, lng=${lng}`);

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
        // console.log(`📡 Запрос к Nominatim: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AgroApp/1.0'
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            // console.warn(`⚠️ Nominatim вернул ошибку: ${response.status}`);
            return null;
        }

        const data = await response.json();
        // console.log('📥 Получены данные от Nominatim:', data);

        const address = data.address;

        // Ищем регион в разных полях
        let regionName = address.state ||
            address.province ||
            address.region ||
            address.city ||
            address.town ||
            address.village ||
            address.county;

        // console.log(`📍 Найдено название региона: "${regionName}"`);

        if (!regionName) {
            // console.warn('⚠️ Не удалось определить регион по ответу Nominatim');
            return null;
        }

        // Пробуем найти регион по названию
        const regionId = findRegionByName(regionName);

        if (regionId) {
            // console.log(`✅ Найден регион: ${regionId}`);

            // Ищем субъект, который соответствует найденному названию
            const subject = REGION_SUBJECTS.find(s =>
                s.regionId === regionId &&
                (s.name.toLowerCase().includes(regionName.toLowerCase()) ||
                    regionName.toLowerCase().includes(s.name.toLowerCase()))
            );

            // Если не нашли точное совпадение, берём первый субъект в регионе
            const finalSubject = subject || REGION_SUBJECTS.find(s => s.regionId === regionId);

            // console.log(`📌 Найден субъект: "${finalSubject?.name}" (ID: ${finalSubject?.id})`);

            return {
                regionId: regionId,
                subjectId: finalSubject?.id || null,
                subjectName: finalSubject?.name || regionName
            };
        }

        // console.warn(`⚠️ Не найден регион для названия: "${regionName}"`);
        return null;
    } catch (error) {
        // console.error('❌ Ошибка определения региона через API:', error);
        return null;
    }
}

/**
 * Определение региона и субъекта для поля
 */
export async function detectRegionForField(field) {
    // console.log('🔍 Начинаем определение региона для поля:', field);

    const coords = field.plots?.[0]?.coordinates || field.coordinates;
    if (!coords || coords.length === 0) {
        // console.warn('⚠️ Нет координат для определения региона');
        return null;
    }

    // console.log(`📍 Координаты поля: ${coords.length} точек`);

    // Находим центр полигона
    const center = coords.reduce((acc, [lat, lng]) => ({
        lat: acc.lat + lat / coords.length,
        lng: acc.lng + lng / coords.length
    }), { lat: 0, lng: 0 });

    // console.log(`🎯 Центр полигона: lat=${center.lat}, lng=${center.lng}`);

    const result = await detectRegionByCoordinatesAPI(center.lat, center.lng);

    // if (result) {
    //     console.log(`✅ Регион определён: regionId=${result.regionId}, subjectId=${result.subjectId}, subjectName="${result.subjectName}"`);
    // } else {
    //     console.warn('⚠️ Регион не определён');
    // }

    return result;
}