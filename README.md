Meta Model API Configuration

CorroSense integrates with Meta's official Meta Model API for AI-powered corrosion inspection and maintenance assistance.

The integration uses Meta's Muse models and image segmentation capabilities.

1. Get your API key
Visit the official Meta Model API developer platform: https://dev.meta.ai/
Sign in to your Meta developer account.
Open the Model API dashboard.
Generate your API key.

Refer to the official documentation: https://dev.meta.ai/docs/overview

2. Configure your API key

Create a .env.local file in the root directory of the project.

Add the following:

MODEL_API_KEY=YOUR_META_MODEL_API_KEY
CORROSENSE_LIVE_ANALYSIS=true


Replace YOUR_META_MODEL_API_KEY with your own API key generated through Meta Model API.

3. Important security information
Never share your API key publicly.
Never upload .env.local to GitHub.
API keys must remain on the server side.
Restart the development server after modifying environment variables.
4. Run CorroSense (bash)
npm install
npm run dev


Open http://localhost:3000 to access the application.

Note: Access to Meta Model API may be subject to account eligibility, usage limits and applicable pricing.