// src/utils/exportFieldPdf.js
import html2pdf from 'html2pdf.js';

/**
 * Формирует и скачивает PDF-отчёт по полю.
 * @param {Object} field - объект поля из состояния
 * @param {Object} refs - справочники из ReferenceContext
 * @param {Object|null} seedingCalc - расчёт нормы высева (если есть)
 * @param {Object|null} diffGrid - параметры сетки дифпосева (если есть)
 */
export function exportFieldPdf(field, refs, seedingCalc = null, diffGrid = null) {
    const d = field.data || {};
    const plots = field.plots || [];
    const totalArea = plots.reduce((s, p) => s + (parseFloat(p.area) || 0), 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Вспомогательные функции
    const cropName = d.cropType ? refs.getCropName(d.cropType) : '—';
    const soilName = d.soilType ? refs.getSoilName(d.soilType) : '—';
    const soilGroupName = d.soilType ? refs.getSoilGroupName(refs.getSoilGroupByTypeId(d.soilType)) : '—';
    const regionName = d.regionId ? refs.getRegionName(d.regionId) : '—';
    const subjectName = d.subjectId ? refs.getSubjectName(d.subjectId) : '—';

    // Агрохимия: собираем все пробы
    const samples = d.agrochemistry?.samples || [];
    const agroRows = refs.agro_params.map(param => {
        const values = samples.map(s => s.values?.[param.id]);
        const hasAny = values.some(v => v != null && v !== '');
        if (!hasAny) return null;
        return {
            name: param.name,
            unit: param.unit,
            values: values.map(v => v != null && v !== '' ? Number(v).toFixed(2) : '—'),
        };
    }).filter(Boolean);

    // HTML-шаблон отчёта
    const element = document.createElement('div');
    element.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 20px; font-size: 12px;">
        <!-- Шапка -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2e7d32; padding-bottom: 10px; margin-bottom: 20px;">
            <div>
                <div style="font-size: 20px; font-weight: 700; color: #2e7d32;">🌾 АгроПО-М</div>
                <div style="font-size: 11px; color: #666;">Отчёт по полю</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #666;">
                <div>Дата формирования: ${dateStr}</div>
            </div>
        </div>

        <!-- Основная информация -->
        <h2 style="color: #2e7d32; font-size: 16px; margin: 0 0 10px 0;">1. Основная информация</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; width: 35%; font-weight: 600;">Название поля</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${d.name || '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Кадастровый номер</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${d.cadastralNumber || '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Культура</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${cropName}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Тип почвы</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${soilName}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Группа почвы</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${soilGroupName}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Агрономическая зона</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${regionName}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Субъект РФ</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${subjectName}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Общая площадь</td><td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: 600;">${totalArea.toFixed(2)} га</td></tr>
            ${d.notes ? `<tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Примечания</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${d.notes}</td></tr>` : ''}
        </table>

        <!-- Участки -->
        <h2 style="color: #2e7d32; font-size: 16px; margin: 0 0 10px 0;">2. Участки поля (${plots.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
            <thead>
                <tr style="background: #2e7d32; color: white;">
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: center;">№</th>
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: right;">Площадь, га</th>
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: center;">Кол-во вершин</th>
                </tr>
            </thead>
            <tbody>
                ${plots.map((p, i) => `
                    <tr>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${(parseFloat(p.area) || 0).toFixed(2)}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${p.coordinates?.length || 0}</td>
                    </tr>
                `).join('')}
                <tr style="background: #f5f5f5; font-weight: 600;">
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">Итого</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${totalArea.toFixed(2)}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
                </tr>
            </tbody>
        </table>

        ${agroRows.length > 0 ? `
        <!-- Агрохимия -->
        <h2 style="color: #2e7d32; font-size: 16px; margin: 0 0 10px 0;">3. Агрохимический анализ</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
            <thead>
                <tr style="background: #2e7d32; color: white;">
                    <th style="padding: 5px 6px; border: 1px solid #1b5e20; text-align: left;">Параметр</th>
                    <th style="padding: 5px 6px; border: 1px solid #1b5e20; text-align: center;">Ед.</th>
                    ${samples.map((_, i) => `<th style="padding: 5px 6px; border: 1px solid #1b5e20; text-align: center;">Проба ${i + 1}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${agroRows.map(row => `
                    <tr>
                        <td style="padding: 5px 6px; border: 1px solid #ddd;">${row.name}</td>
                        <td style="padding: 5px 6px; border: 1px solid #ddd; text-align: center;">${row.unit}</td>
                        ${row.values.map(v => `<td style="padding: 5px 6px; border: 1px solid #ddd; text-align: center;">${v}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${seedingCalc ? `
        <!-- Расчёт нормы высева -->
        <h2 style="color: #2e7d32; font-size: 16px; margin: 0 0 10px 0;">4. Расчёт нормы высева и внесения удобрений</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; width: 40%; font-weight: 600;">Культура</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${refs.getCropName(seedingCalc.crop_id)}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Масса 1000 зёрен, г</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${seedingCalc.mass_1000}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Чистота, %</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${seedingCalc.purity}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Всхожесть, %</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${seedingCalc.germination}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Ширина междурядий, см</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${seedingCalc.row_width ?? '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Глубина заделки, мм</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${seedingCalc.seed_depth ?? '—'}</td></tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
            <thead>
                <tr style="background: #2e7d32; color: white;">
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: center;">Участок</th>
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: right;">N высева, кг/га</th>
                    <th style="padding: 6px 8px; border: 1px solid #1b5e20; text-align: right;">N внесения, кг/га</th>
                </tr>
            </thead>
            <tbody>
                ${(seedingCalc.norms || []).map(n => `
                    <tr>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">№ ${n.plot_index + 1}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${Number(n.seeding_rate).toFixed(2)}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${n.fertilization_rate != null ? Number(n.fertilization_rate).toFixed(2) : '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${diffGrid ? `
        <!-- Сетка дифпосева -->
        <h2 style="color: #2e7d32; font-size: 16px; margin: 0 0 10px 0;">${seedingCalc ? '5' : '4'}. Параметры сетки дифференцированного посева</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; width: 40%; font-weight: 600;">Направление гона, °</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${diffGrid.params?.direction ?? '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Ширина сеялки, м</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${diffGrid.params?.seederWidth ?? '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Кратность</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${diffGrid.params?.multiplicity ?? '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Размер ячейки, м</td><td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: 600;">${diffGrid.cellSize ?? '—'}</td></tr>
            <tr><td style="padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600;">Смещение X / Y, м</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${diffGrid.params?.offsetX ?? 0} / ${diffGrid.params?.offsetY ?? 0}</td></tr>
        </table>
        ` : ''}

        <!-- Футер -->
        <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #888; text-align: center;">
            Отчёт сформирован в системе АгроПО-М · ${dateStr}
        </div>
    </div>
    `;

    const fileName = `${(d.name || 'field').replace(/[\\/:*?"<>|]+/g, '_')}_report.pdf`;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    return html2pdf().set(opt).from(element).save();
}