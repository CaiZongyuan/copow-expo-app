import * as Calendar from "expo-calendar";

import {
  ensureCalendarAccess,
  getWritableEventCalendar,
  listWritableEventCalendars,
  parseRequiredDate,
  toDateValue,
  toIsoString,
  type MobileToolExecutor,
} from "@/features/chat/tools/executors/mobile/shared";

export const calendarExecutors = {
  get_upcoming_events: async ({ days = 7, limit = 10 }) => {
    await ensureCalendarAccess();

    const startDate = new Date();
    const endDate = new Date(startDate);

    endDate.setDate(endDate.getDate() + days);

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarLookup = new Map(
      calendars.map((calendar) => [calendar.id, calendar.title])
    );
    const visibleCalendarIds = calendars
      .filter((calendar) => calendar.isVisible !== false)
      .map((calendar) => calendar.id);

    const events = visibleCalendarIds.length
      ? await Calendar.getEventsAsync(visibleCalendarIds, startDate, endDate)
      : [];

    const normalizedEvents = events
      .map((event) => {
        const eventStartDate = toDateValue(event.startDate);
        const eventEndDate = toDateValue(event.endDate);

        if (!eventStartDate || !eventEndDate) {
          return undefined;
        }

        return {
          id: event.id,
          title: event.title,
          startDate: toIsoString(eventStartDate),
          endDate: toIsoString(eventEndDate),
          location: event.location ?? null,
          isAllDay: event.allDay,
          calendarTitle: calendarLookup.get(event.calendarId) ?? "Unknown calendar",
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort(
        (left, right) =>
          new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
      )
      .slice(0, limit);

    return {
      days,
      total: normalizedEvents.length,
      rangeStart: toIsoString(startDate),
      rangeEnd: toIsoString(endDate),
      events: normalizedEvents,
    };
  },
  list_writable_calendars: async ({ includeHidden = false }) => {
    await ensureCalendarAccess();

    const calendars = await listWritableEventCalendars(includeHidden);

    return {
      total: calendars.length,
      calendars,
    };
  },
  create_calendar_event: async ({
    title,
    startDate,
    endDate,
    location,
    notes,
    allDay = false,
    calendarId,
  }) => {
    await ensureCalendarAccess();

    const targetCalendar = await getWritableEventCalendar(calendarId);
    const eventStartDate = parseRequiredDate(startDate, "startDate");
    const eventEndDate = parseRequiredDate(endDate, "endDate");

    if (eventEndDate.getTime() <= eventStartDate.getTime()) {
      throw new Error("Calendar event endDate must be later than startDate.");
    }

    const eventId = await Calendar.createEventAsync(targetCalendar.id, {
      title,
      startDate: eventStartDate,
      endDate: eventEndDate,
      location,
      notes,
      allDay,
    });

    const createdEvent = await Calendar.getEventAsync(eventId).catch(
      () => undefined
    );
    const normalizedStartDate =
      toDateValue(createdEvent?.startDate) ?? eventStartDate;
    const normalizedEndDate = toDateValue(createdEvent?.endDate) ?? eventEndDate;

    return {
      status: "created" as const,
      eventId,
      calendarId: targetCalendar.id,
      calendarTitle: targetCalendar.title,
      title: createdEvent?.title ?? title,
      startDate: toIsoString(normalizedStartDate),
      endDate: toIsoString(normalizedEndDate),
      location: createdEvent?.location ?? location ?? null,
      notes: createdEvent?.notes ?? notes ?? null,
      isAllDay: createdEvent?.allDay ?? allDay,
    };
  },
} satisfies Record<string, MobileToolExecutor>;
