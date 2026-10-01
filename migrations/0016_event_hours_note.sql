-- Free-text hours for events whose times differ by day (for example, a market open different hours on Fridays
-- and Saturdays). When set, it's shown in place of the start and end times.
ALTER TABLE events ADD COLUMN hours_note TEXT NOT NULL DEFAULT '';
