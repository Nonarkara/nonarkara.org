# Later: a one-line reading of the day

Design only. This slice does not ship a model, a prompt runner, a chat surface, or a copilot. The desk stays a document.

The reading runs on the M3, on the same slow cadence as the calendar sync, and only when the machine is not already busy. FloodDash still comes first. A local model, or an API the operator already runs on that machine, is enough. The day is not sent to a new third-party chat product, and there is no conversation UI on the pavilion.

Input is the agenda JSON the listener already serves (`today`, `travel`, `kind`, `hold`, `start`, `end`, `where`). No other store. Output is at most one or two sentences, returned as a field beside that JSON when the operator turns the reading on. If the model is absent or slow, the field is omitted. The blocks themselves still render.

## Conflict

A conflict is a `travel` or `leave` block whose interval overlaps an in-person `event` on the same Bangkok day.

In-person means `kind` is `event` and `where` is non-empty and is not a URL. Overlap is half-open: the two intervals share time. The finding names the two blocks and the overlap. It does not move either of them.

## Leave timing

`leave-the-house` and `leave-for-airport` are holds already tagged by the listener.

- A `leave-for-airport` hold should end before the next `travel` block starts.
- A `leave-the-house` hold should end before the next in-person event or `travel` block starts.
- A `travel` block with no earlier hold the same day is its own finding: the leave was never put on the desk.

The gap between the hold and the thing it serves is the operator’s buffer, stored later as a setting on the M3. It is not hardcoded here, and it is not inferred from a past day. Missing, inverted (hold starts after the departure), or tighter than the buffer are the three findings. The reading says which one it is. It does not book a car or change the calendar.

## What’s next

One sentence. The subject is the next block whose end is still in the future, plus the next hold if that hold is sooner. No list, no suggestions of things that are not already on the desk, no question back to the operator.

The sentence is a line under the agenda heading, in the same type as the rest of the desk. It is not a panel, a badge, or a chat transcript.
