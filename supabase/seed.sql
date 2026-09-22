insert into vibe_tags (id, slug, label) values
  ('silent-study', 'silent-study', 'Silent Study'),
  ('group-friendly', 'group-friendly', 'Group Friendly'),
  ('lots-of-outlets', 'lots-of-outlets', 'Lots of Outlets'),
  ('lake-view', 'lake-view', 'Lake View'),
  ('coffee-nearby', 'coffee-nearby', 'Coffee Nearby'),
  ('late-night', 'late-night', 'Late Night Hours'),
  ('natural-light', 'natural-light', 'Natural Light'),
  ('monitors-available', 'monitors-available', 'External Monitors Available');

insert into locations (id, name, category, lat, lng, address, hours_description, amenities, busy_score, atmosphere_score, is_active, is_featured, last_updated) values
  ('college-library', 'College Library (Helen C. White)', 'library', 43.0767, -89.4013, '600 N Park St, Madison, WI', 'Open until 2:00 AM', array['Outlets','Wifi','Group Rooms'], 8, 'Lively', true, false, now() - interval '5 minutes'),
  ('memorial-library', 'Memorial Library', 'library', 43.0754, -89.398, '728 State St, Madison, WI', 'Open until midnight', array['Outlets','Wifi','Silent Floors'], 2, 'Calm', true, false, now() - interval '20 minutes'),
  ('steenbock-library', 'Steenbock Library', 'library', 43.0761, -89.4134, '550 Babcock Dr, Madison, WI', 'Open until 10:00 PM', array['Outlets','Wifi','Natural Light'], 3, 'Calm', true, false, now() - interval '45 minutes'),
  ('wendt-commons', 'Wendt Commons', 'library', 43.0715, -89.4086, '215 N Randall Ave, Madison, WI', 'Open until 1:00 AM', array['Outlets','Wifi','Group Tables'], 5, 'Moderate', true, false, now() - interval '10 minutes'),
  ('memorial-union', 'Memorial Union (Study Lounges)', 'union', 43.0765, -89.4003, '800 Langdon St, Madison, WI', 'Open until 11:00 PM', array['Wifi','Lake Terrace','Food Nearby'], 9, 'Lively', true, false, now() - interval '3 minutes'),
  ('union-south', 'Union South (Upper Floors)', 'union', 43.0718, -89.4081, '1308 W Dayton St, Madison, WI', 'Open until midnight', array['Outlets','Wifi','Food Nearby'], 6, 'Moderate', true, false, now() - interval '90 minutes');

insert into location_tags (location_id, vibe_tag_id) values
  ('college-library', 'group-friendly'),
  ('college-library', 'lake-view'),
  ('college-library', 'late-night'),
  ('memorial-library', 'silent-study'),
  ('steenbock-library', 'natural-light'),
  ('wendt-commons', 'lots-of-outlets'),
  ('wendt-commons', 'group-friendly'),
  ('memorial-union', 'coffee-nearby'),
  ('memorial-union', 'lake-view'),
  ('union-south', 'group-friendly'),
  ('union-south', 'coffee-nearby');
