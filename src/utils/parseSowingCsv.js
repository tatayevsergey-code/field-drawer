// Парсер трека результатов посева (разделитель ';', списки внутри — ',')
export function parseSowingCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('Файл пуст');
    const header = lines[0].split(';').map(h => h.trim());
    const col = (name) => header.indexOf(name);
    const iT = col('time'), iLng = col('longitude'), iLat = col('latitude');
    if (iT < 0 || iLat < 0 || iLng < 0) {
        throw new Error('Не найдены обязательные колонки time/longitude/latitude');
    }
    const iSpeed = col('speed'), iCourse = col('course'), iPress = col('pressureBunker'),
        iBlow = col('blower'), iGird = col('girderState'), iAS = col('alarmSowingUnit'),
        iAE = col('alarmEmptyBunker'), iAB = col('alarmBlower'), iAP = col('alarmPressureBunker'),
        iASp = col('alarmSpeed'), iCoul = col('coulters');

    const iList = (s) => (s || '').split(',').filter(x => x.trim() !== '').map(x => parseInt(x, 10));
    const fList = (s) => (s || '').split(',').filter(x => x.trim() !== '').map(x => parseFloat(x));
    const num = (c, i, d = 0) => (i >= 0 && c[i] !== undefined && c[i] !== '' ? (parseFloat(c[i]) || d) : d);
    const int = (c, i, d = 0) => (i >= 0 && c[i] !== undefined && c[i] !== '' ? (parseInt(c[i], 10) || d) : d);

    const points = [];
    for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(';');
        const lat = parseFloat(c[iLat]), lng = parseFloat(c[iLng]);
        if (!isFinite(lat) || !isFinite(lng)) continue;

        const raw = {};
        header.forEach((h, idx) => { raw[h] = (c[idx] ?? '').trim(); });

        const alarmSowing = iAS >= 0 ? iList(c[iAS]) : [];
        const alarmEmpty  = iAE >= 0 ? iList(c[iAE]) : [];
        const alarmPress  = iAP >= 0 ? iList(c[iAP]) : [];
        const coulters    = iCoul >= 0 ? iList(c[iCoul]) : [];
        const status = Math.max(0,
            int(c, iAB), int(c, iASp),
            ...alarmSowing, ...alarmEmpty, ...alarmPress, ...coulters);

        points.push({
            time: (c[iT] || '').trim(),
            lat, lng,
            speed: num(c, iSpeed), course: num(c, iCourse),
            status, raw,
        });
    }
    if (!points.length) throw new Error('Нет валидных точек трека');
    return { points };
}