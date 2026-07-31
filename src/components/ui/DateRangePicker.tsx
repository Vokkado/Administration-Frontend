/**
 * Selector de rango de fechas: botón con el rango actual + panel desplegable (presets a la
 * izquierda, calendario de dos meses a la derecha para elegir un rango custom). `value: null`
 * significa "Siempre" (sin filtro de fecha, trae todo). Sin librerías de fechas — solo Date nativo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IoCalendarOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import './DateRangePicker.css';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (value: DateRange | null) => void;
  label?: string;
}

const WEEKDAY_LABELS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date): Date { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function startOfWeek(d: Date): Date { const wd = (d.getDay() + 6) % 7; return startOfDay(addDays(d, -wd)); }
function endOfWeek(d: Date): Date { return endOfDay(addDays(startOfWeek(d), 6)); }
function startOfMonth(d: Date): Date { return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)); }
function endOfMonth(d: Date): Date { return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
function startOfYear(d: Date): Date { return startOfDay(new Date(d.getFullYear(), 0, 1)); }
function endOfYear(d: Date): Date { return endOfDay(new Date(d.getFullYear(), 11, 31)); }
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pad(n: number): string { return String(n).padStart(2, '0'); }
function formatDMY(d: Date): string { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }

function buildPresets(): Array<{ label: string; range: DateRange | null }> {
  const today = new Date();
  const yesterday = addDays(today, -1);
  const lastWeekAnchor = addDays(today, -7);
  return [
    { label: 'Siempre', range: null },
    { label: 'Hoy', range: { from: startOfDay(today), to: endOfDay(today) } },
    { label: 'Ayer', range: { from: startOfDay(yesterday), to: endOfDay(yesterday) } },
    { label: 'Esta semana', range: { from: startOfWeek(today), to: endOfDay(today) } },
    { label: 'La semana pasada', range: { from: startOfWeek(lastWeekAnchor), to: endOfWeek(lastWeekAnchor) } },
    { label: 'Las últimas dos semanas', range: { from: startOfWeek(addDays(today, -14)), to: endOfDay(today) } },
    { label: 'Este mes', range: { from: startOfMonth(today), to: endOfDay(today) } },
    { label: 'El mes pasado', range: { from: startOfMonth(addMonths(today, -1)), to: endOfMonth(addMonths(today, -1)) } },
    { label: 'Este año', range: { from: startOfYear(today), to: endOfDay(today) } },
    { label: 'El año pasado', range: { from: startOfYear(addMonths(today, -12)), to: endOfYear(addMonths(today, -12)) } },
  ];
}

/** Semanas (lunes a domingo) de un mes, incluyendo días del mes anterior/siguiente para completar la grilla. */
function buildMonthGrid(viewMonth: Date): Date[][] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  let cursor = addDays(firstOfMonth, -firstWeekday);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) { week.push(cursor); cursor = addDays(cursor, 1); }
    weeks.push(week);
  }
  return weeks;
}

export function DateRangePicker({ value, onChange, label }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingStart(null);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setPendingStart(null); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const presets = useMemo(() => buildPresets(), []);
  const today = useMemo(() => startOfDay(new Date()), []);
  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);

  const previewRange: DateRange | null = pendingStart
    ? {
      from: hoverDay && hoverDay < pendingStart ? hoverDay : pendingStart,
      to: hoverDay && hoverDay > pendingStart ? hoverDay : pendingStart,
    }
    : value;

  function isActivePreset(range: DateRange | null): boolean {
    if (range === null) return value === null;
    if (!value) return false;
    return sameDay(range.from, value.from) && sameDay(range.to, value.to);
  }

  function handlePresetClick(range: DateRange | null) {
    onChange(range);
    setPendingStart(null);
    setOpen(false);
  }

  function handleDayClick(day: Date) {
    if (day > today) return;
    if (!pendingStart) {
      setPendingStart(day);
      return;
    }
    const from = day < pendingStart ? day : pendingStart;
    const to = day < pendingStart ? pendingStart : day;
    onChange({ from: startOfDay(from), to: endOfDay(to) });
    setPendingStart(null);
    setOpen(false);
  }

  function dayClasses(day: Date, monthRef: Date): string {
    const classes = ['drp-day'];
    if (day.getMonth() !== monthRef.getMonth()) classes.push('outside');
    if (day > today) classes.push('disabled');
    if (sameDay(day, today)) classes.push('today');
    if (previewRange && day >= startOfDay(previewRange.from) && day <= startOfDay(previewRange.to)) classes.push('in-range');
    if (previewRange && sameDay(day, previewRange.from)) classes.push('range-start');
    if (previewRange && sameDay(day, previewRange.to)) classes.push('range-end');
    return classes.join(' ');
  }

  function renderMonth(monthRef: Date, showPrev: boolean, showNext: boolean) {
    const weeks = buildMonthGrid(monthRef);
    return (
      <div className="drp-month">
        <div className="drp-month-header">
          {showPrev ? (
            <button type="button" className="drp-nav" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Mes anterior">
              <IoChevronBack />
            </button>
          ) : <span className="drp-nav-spacer" />}
          <span className="drp-month-label">{MONTH_LABELS[monthRef.getMonth()].slice(0, 3)}. {monthRef.getFullYear()}</span>
          {showNext ? (
            <button type="button" className="drp-nav" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Mes siguiente">
              <IoChevronForward />
            </button>
          ) : <span className="drp-nav-spacer" />}
        </div>
        <div className="drp-weekdays">
          {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="drp-weeks">
          {weeks.map((week) => (
            <div className="drp-week" key={week[0].toISOString()}>
              {week.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={dayClasses(day, monthRef)}
                  disabled={day > today}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHoverDay(day)}
                  onMouseLeave={() => setHoverDay((h) => (h && sameDay(h, day) ? null : h))}
                >
                  {day.getDate()}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="drp-container">
      {label && <span className="drp-label">{label}</span>}
      <div className="drp-anchor" ref={containerRef}>
        <button type="button" className="drp-trigger" onClick={() => setOpen((o) => !o)}>
          <IoCalendarOutline />
          {value ? `${formatDMY(value.from)} - ${formatDMY(value.to)}` : 'Siempre'}
        </button>

        {open && (
          <div className="drp-panel">
            <div className="drp-presets">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={isActivePreset(p.range) ? 'active' : ''}
                  onClick={() => handlePresetClick(p.range)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="drp-calendars">
              {renderMonth(leftMonth, true, false)}
              {renderMonth(rightMonth, false, true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
