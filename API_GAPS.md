# API Gaps & Mock Data Requirements

This document tracks any data or endpoints we need that aren't currently available in the API.
Share this list with the backend developer to coordinate changes.

**Last Updated:** January 16, 2026

---

## Missing Data Fields

### None currently identified
All current frontend requirements are met by the existing API.

---

## Missing Endpoints

### None currently identified
All current frontend requirements are met by the existing API.

---

## Notes for Backend Developer

1. **Snake case vs camelCase**: The API returns snake_case fields (e.g., `first_name`), which we automatically convert to camelCase on the frontend using the `deepCamel()` utility. Input schemas use camelCase (e.g., `EventSchema-Input` has `startDate`), output schemas use snake_case (e.g., `EventSchema-Output` has `start_date`).

2. **Speaker intake_form_status field**: This appears to be a string field. Please confirm valid values (e.g., "pending", "submitted", "approved", "rejected").

3. **Event status field**: Referenced in query params but not defined in schema. Please confirm valid values.

4. **Modules structure**: Currently defined as `additionalProperties: true` object. Frontend expects keys like `speaker`, `schedule`, `content`, `attendee`, `app` with boolean or object values.

---

## Questions for Backend Developer

1. What are the valid values for `intake_form_status` on speakers?
2. What are the valid values for event `status` field?
3. What should the modules object structure look like? (boolean values or nested objects with metadata?)
4. Does the `/account/me` endpoint return user data including first_name, last_name, role, team_ids?

---

## Future Features (Not Urgent)

These features will be needed as we build out the app:

- Event duplication endpoint
- Event archiving endpoint
- Bulk speaker operations
- Speaker intake form builder endpoints
- Embed builder configuration storage
- Email template management
