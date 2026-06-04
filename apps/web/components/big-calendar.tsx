/**
 * BigCalendarES: wrapper de react-big-calendar localizado en español.
 *
 * Mejoras visuales sobre el default:
 *  - Renderer de evento personalizado: hora arriba en mono, título debajo
 *    con elipsis. Se acomoda bien cuando hay múltiples eventos solapados.
 *  - Estilo diferenciado para reservas propias vs turnos fijos sin franjas
 *    pesadas (más limpio cuando los tiles son angostos).
 *  - Tooltip nativo (`title`) con info completa para tiles recortados.
 *  - Sin bordes duros: usamos color sólido más una banda izquierda como
 *    indicador de tipo, alineado con el estilo de Google/Linear.
 */

'use client';

import * as React from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  EventProps,
  View,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: { isRecurring?: boolean; [k: string]: unknown };
}

/**
 * eventPropGetter
 * ---------------------------------------------------------------------------
 * Devuelve estilos por evento. Mantenemos colores planos (sin gradientes,
 * sin patrones) porque cuando los tiles son angostos los patrones se ven
 * caóticos. La diferenciación visual viene por:
 *   - Color de fondo distinto.
 *   - Banda lateral (border-left) del color principal.
 *   - className opcional para hover/focus.
 */
function eventPropGetter(event: CalendarEvent): { className: string; style: React.CSSProperties } {
  if (event.resource?.isRecurring) {
    return {
      className: 'rbc-event-recurring',
      style: {
        backgroundColor: '#52525b', // zinc-600
        borderLeft: '3px solid #18181b', // zinc-900
        color: '#fafafa',
        borderRadius: 6,
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
        padding: 0,
        outline: 'none',
      },
    };
  }
  return {
    className: 'rbc-event-own',
    style: {
      backgroundColor: '#059669', // brand-600
      borderLeft: '3px solid #064e3b', // brand-900
      color: '#ffffff',
      borderRadius: 6,
      boxShadow: '0 1px 2px rgba(5,150,105,0.25)',
      padding: 0,
      outline: 'none',
    },
  };
}

/**
 * Renderer de evento compacto y robusto ante el truncado.
 *  - Línea 1: HH:mm en mono (tabular-nums para alineación perfecta).
 *  - Línea 2: título con elipsis.
 * El `title` HTML provee tooltip nativo con el texto completo.
 */
function EventCard({ event }: EventProps<CalendarEvent>) {
  const startLabel = format(event.start, 'HH:mm');
  const endLabel = format(event.end, 'HH:mm');
  return (
    <div
      title={`${startLabel}-${endLabel} · ${event.title}`}
      className="flex h-full w-full flex-col gap-0.5 overflow-hidden px-1.5 py-1"
    >
      <span className="font-mono text-[10px] font-medium leading-none tabular-nums opacity-90">
        {startLabel}
      </span>
      <span className="truncate text-[11px] font-medium leading-tight">
        {event.title}
      </span>
    </div>
  );
}

interface BigCalendarESProps {
  events: CalendarEvent[];
  defaultDate?: Date;
  defaultView?: View;
  onSelectEvent?: (event: CalendarEvent) => void;
  style?: React.CSSProperties;
}

export function BigCalendarES({
  events,
  defaultDate,
  defaultView = 'week',
  onSelectEvent,
  style,
}: BigCalendarESProps) {
  return (
    <Calendar
      localizer={localizer}
      culture="es"
      events={events}
      defaultDate={defaultDate}
      defaultView={defaultView}
      views={['month', 'week', 'day', 'agenda']}
      eventPropGetter={eventPropGetter}
      components={{ event: EventCard }}
      dayLayoutAlgorithm="no-overlap"
      messages={{
        date: 'Fecha',
        time: 'Hora',
        event: 'Turno',
        allDay: 'Todo el día',
        week: 'Semana',
        work_week: 'Semana laboral',
        day: 'Día',
        month: 'Mes',
        previous: 'Anterior',
        next: 'Siguiente',
        yesterday: 'Ayer',
        tomorrow: 'Mañana',
        today: 'Hoy',
        agenda: 'Agenda',
        noEventsInRange: 'No hay turnos en este rango.',
        showMore: (n) => `+ ${n} más`,
      }}
      startAccessor="start"
      endAccessor="end"
      onSelectEvent={onSelectEvent}
      style={{ height: 640, ...style }}
      min={new Date(new Date().setHours(13, 0, 0, 0))}
      max={new Date(new Date().setHours(23, 0, 0, 0))}
    />
  );
}
