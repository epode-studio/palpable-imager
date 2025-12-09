const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  // Only sign on macOS
  if (process.platform !== 'darwin') {
    return;
  }

  const appPath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app';

  console.log('Ad-hoc signing app at:', appPath);

  try {
    // Ad-hoc sign the entire app bundle
    execSync(`codesign --deep --force --sign - "${appPath}"`, {
      stdio: 'inherit'
    });
    console.log('Ad-hoc signing completed successfully');
  } catch (error) {
    console.error('Ad-hoc signing failed:', error.message);
    // Don't fail the build if signing fails
  }
};
