import {
  buildChatTools,
  buildToolContext,
  getToolManifest,
  isMobileToolName,
} from "@/features/chat/tools/registry";

const iosContext = buildToolContext({
  platform: "ios",
  knownCapabilities: {
    healthkit: true,
    calendar: true,
    contacts: true,
    location: true,
    externalLinking: true,
  },
});

const webContext = buildToolContext({
  platform: "web",
});

const iosTools = buildChatTools(iosContext);
const webTools = buildChatTools(webContext);
const sleepManifest = getToolManifest("get_recent_sleep");
const createEventManifest = getToolManifest("create_calendar_event");

if (!sleepManifest || !createEventManifest) {
  throw new Error("Expected mobile manifests to be registered.");
}

const sleepSummary = sleepManifest.presentation.formatOutput?.({
  days: 7,
  sampleCount: 1,
  totalSleepMinutes: 420,
  entries: [
    {
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      durationMinutes: 420,
      stage: "asleep",
    },
  ],
});

const approvalSummary = createEventManifest.presentation.formatApproval?.({
  title: "Project kickoff",
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  allDay: false,
});

if (!sleepSummary || !approvalSummary) {
  throw new Error("Expected presentation helpers to return summaries.");
}

if (!("get_current_time" in iosTools)) {
  throw new Error("Expected server tools to remain exposed.");
}

if (!("get_recent_sleep" in iosTools)) {
  throw new Error("Expected iOS mobile tools to be exposed.");
}

if ("get_recent_sleep" in webTools) {
  throw new Error("Expected unsupported mobile-only tools to stay hidden on web.");
}

if (!isMobileToolName("get_current_location")) {
  throw new Error("Expected mobile tool type guard to recognize current location.");
}
