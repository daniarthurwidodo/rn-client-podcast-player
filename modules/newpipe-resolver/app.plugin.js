const { withAppBuildGradle } = require('expo/config-plugins');

const DESUGAR_ENABLED = 'coreLibraryDesugaringEnabled true';
const DESUGAR_DEPENDENCY = "coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'";
const ANDROID_BLOCK = /^android \{/m;
const DEPENDENCIES_BLOCK = /^dependencies \{/m;

// NewPipe Extractor uses java.time and other Java 11 APIs that minSdk 24 devices lack.
module.exports = function withCoreLibraryDesugaring(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes(DESUGAR_ENABLED)) {
      contents = contents.replace(ANDROID_BLOCK, `android {\n    compileOptions {\n        ${DESUGAR_ENABLED}\n    }`);
    }
    if (!contents.includes(DESUGAR_DEPENDENCY)) {
      contents = contents.replace(DEPENDENCIES_BLOCK, `dependencies {\n    ${DESUGAR_DEPENDENCY}`);
    }
    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
