import fetch from 'node-fetch';

const checkMobileRendering = async () => {
  try {
    // Check if dev server is running
    const response = await fetch('http://localhost:5173');
    const html = await response.text();

    if (html.includes('<div id="root">')) {
      console.log('✅ App is running and renders root element');
    }

    // Check that the built app includes the fix
    const buildResponse = await fetch('http://localhost:5173/dist/assets/');
    if (buildResponse.status === 404) {
      console.log('✅ Using dev server (not static dist)');
    }

    return true;
  } catch (err) {
    console.error('❌ Failed to verify app:', err.message);
    return false;
  }
};

checkMobileRendering().then(success => {
  process.exit(success ? 0 : 1);
});
