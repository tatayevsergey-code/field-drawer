// ─────────────────────────────────────────────────────────────
// НАСТРОЙКИ РАЗРАБОТЧИКА (в UI оператора не выводятся).
// Меняются здесь и попадают в сборку фронтенда.
// ─────────────────────────────────────────────────────────────

// Вариант выгрузки карты-задания (KML) для посевного комплекса:
//   'protocol' — по утверждённому протоколу взаимодействия:
//                Schema radiozavod (RATE_SEED / RATE_FERT),
//                атрибуты Folder depth_seed / row_width
//   'example'  — по эталонному примеру файла:
//                Schema radiozavod (seedingRate / fertilizerRate)
//                + Schema initParameters (seedType, fieldArea, ...)
export const TASK_EXPORT_FORMAT = 'example'; // 'protocol' | 'example'