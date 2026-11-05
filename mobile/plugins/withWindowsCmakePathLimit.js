const { withSettingsGradle } = require('expo/config-plugins')

// CMake names object files after their sources' full paths, so on Windows the repo path appears
// twice in each one. Sources outside the CMake project (react-native-worklets/-reanimated, and the
// Mapbox codegen compiled by :app) overflow the 260-character limit, and ninja fails with
// "mkdir(...): No such file or directory" or "Filename longer than 260 characters". CMake only
// applies its Windows limit on Windows targets, not when building for Android, so set it here and
// CMake hashes the long part of those paths itself.
//
// Hashing keeps the file name and needs 32 characters for the hash, so it gives up on any object
// that still wouldn't fit. :app's objects sit in deeply nested codegen folders, so :app also builds
// in a short folder outside the repo; with that, all 86 objects fit. Keep the libraries' `.cxx`
// where it is: worklets' and reanimated's Gradle scripts look for it at that exact path.
//
// The argument goes on every Android module (it does nothing without native code) because :app
// can't be filtered on its CMake path: React Native's Gradle plugin only sets that after this hook
// has run. This lives in settings.gradle, not the root build.gradle, because :app is already
// evaluated by the time the root script runs, which is too late to register finalizeDsl.
const MARKER = '// @spotcheck windows-cmake-path-limit'

const SNIPPET = `
${MARKER}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
  gradle.beforeProject { project ->
    ['com.android.library', 'com.android.application'].each { pluginId ->
      project.plugins.withId(pluginId) {
        project.extensions.getByName('androidComponents').finalizeDsl { android ->
          android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=240')
          if (pluginId == 'com.android.application') {
            android.externalNativeBuild.cmake.buildStagingDirectory = new File(System.getProperty('user.home'), '.cxx/app')
          }
        }
      }
    }
  }
}
`

module.exports = function withWindowsCmakePathLimit(config) {
  return withSettingsGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) mod.modResults.contents += SNIPPET
    return mod
  })
}
