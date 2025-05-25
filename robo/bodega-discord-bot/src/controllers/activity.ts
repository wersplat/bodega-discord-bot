// src/controllers/activity.ts
import { createApp, Get } from '@robojs/flashcore';
import { getStandingsFromSheets } from '../../utils/fetchSheets';

const app = createApp();

class ActivityController {
  @Get('/healthz')
  health() { return { status: 'ok' }; }

  @Get('/standings')
  async standings() {
    return getStandingsFromSheets();
  }
}

app.registerController(ActivityController);
export default app;