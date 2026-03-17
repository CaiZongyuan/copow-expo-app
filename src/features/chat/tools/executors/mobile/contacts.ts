import * as Contacts from "expo-contacts";

import {
  ensureContactsAccess,
  type MobileToolExecutor,
} from "@/features/chat/tools/executors/mobile/shared";

export const contactsExecutors = {
  search_contacts: async ({ query, limit = 5 }) => {
    await ensureContactsAccess();

    const response = await Contacts.getContactsAsync({
      name: query,
      pageSize: limit,
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Company,
      ],
    });

    const contacts = response.data.map((contact) => ({
      id: contact.id,
      name:
        contact.name ??
        ([contact.firstName, contact.middleName, contact.lastName]
          .filter(Boolean)
          .join(" ") ||
          "Unnamed contact"),
      company: contact.company ?? null,
      phoneNumbers: (contact.phoneNumbers ?? [])
        .map((phoneNumber) => phoneNumber.number)
        .filter((value): value is string => Boolean(value)),
      emails: (contact.emails ?? [])
        .map((email) => email.email)
        .filter((value): value is string => Boolean(value)),
    }));

    return {
      query,
      total: contacts.length,
      contacts,
    };
  },
} satisfies Record<string, MobileToolExecutor>;
