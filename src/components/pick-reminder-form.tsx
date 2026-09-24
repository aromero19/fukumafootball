"use client";
import AdminForm from "@/components/admin-form";
import { updatePickReminder } from "@/app/profile/actions";

export type ReminderSetting = { enabled: boolean; day: number; send_time: string; timezone: string; has_email: boolean };
export default function PickReminderForm({ entryId, setting }: { entryId: number; setting: ReminderSetting }) {
  const zones = [...new Set([setting.timezone, "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", ...Intl.supportedValuesOf("timeZone")])];
  return <section className="form-stack">
    <h2>Pick reminder emails</h2>
    <p>Get one reminder per week if you haven’t submitted your picks. Reminders are off until you turn them on.</p>
    {!setting.has_email && <p className="status">Ask the administrator to add your email address before turning on reminders. Your address stays private.</p>}
    <AdminForm action={updatePickReminder} className="form-stack">
      <input type="hidden" name="entry_id" value={entryId} />
      <label><input type="checkbox" name="enabled" defaultChecked={setting.enabled} disabled={!setting.has_email} /> Email me when I haven’t submitted my weekly picks</label>
      <label>Day of the week<select name="day" defaultValue={setting.day}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
      <label>Time of day<input type="time" name="send_time" required defaultValue={setting.send_time.slice(0, 5)} /></label>
      <label>Time zone<select name="timezone" defaultValue={setting.timezone}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>
      <p className="muted">Default: Wednesday at 6 p.m. Mountain time (America/Denver). We use your chosen day and time before the current week’s first kickoff, even if that falls in the previous calendar week. Delivery may take a few minutes. No reminders are sent after the first game starts or while kickoff times are missing.</p>
      <button className="button" type="submit">Save reminder settings</button>
    </AdminForm>
  </section>;
}
