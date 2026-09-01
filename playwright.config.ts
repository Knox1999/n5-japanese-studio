import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:45_000,
  expect:{timeout:12_000},
  fullyParallel:false,
  retries:1,
  reporter:[['line'],['html',{open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:4174/n5-japanese-studio/',
    serviceWorkers:'block',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  webServer:{
    command:'serve _e2e -l 4174 --no-clipboard',
    url:'http://127.0.0.1:4174/n5-japanese-studio/',
    reuseExistingServer:true,
    timeout:30_000,
  },
  projects:[
    {name:'mobile-chromium',use:{...devices['Pixel 5']}},
    {name:'mobile-webkit',use:{...devices['iPhone 13']}},
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  ],
});
