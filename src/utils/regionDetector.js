export async function detectRegionByCoordinatesAPI(lat, lng, refs) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'AgroApp/1.0' },
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return null;

        const data = await response.json();
        const address = data.address;

        const regionName = address.state || address.province || address.region ||
            address.city || address.town || address.village || address.county;
        if (!regionName) return null;

        const regionId = refs.findRegionByName(regionName);
        if (regionId) {
            const subject = refs.subjects.find(s =>
                s.zone_id === regionId &&
                (s.name.toLowerCase().includes(regionName.toLowerCase()) ||
                    regionName.toLowerCase().includes(s.name.toLowerCase()))
            );
            const finalSubject = subject || refs.subjects.find(s => s.zone_id === regionId);
            return {
                regionId,
                subjectId: finalSubject?.id || null,
                subjectName: finalSubject?.name || regionName
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function detectRegionForField(field, refs) {
    const coords = field.plots?.[0]?.coordinates || field.coordinates;
    if (!coords || coords.length === 0) return null;

    const center = coords.reduce((acc, [lat, lng]) => ({
        lat: acc.lat + lat / coords.length,
        lng: acc.lng + lng / coords.length
    }), { lat: 0, lng: 0 });

    return detectRegionByCoordinatesAPI(center.lat, center.lng, refs);
}