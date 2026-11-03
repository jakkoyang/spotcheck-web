// Background tasks have to be defined before the app's first render, including when the OS starts
// the app in the background only to deliver a geofence event, so they load ahead of the router.
import './src/lib/checkIns/task'
import 'expo-router/entry'
