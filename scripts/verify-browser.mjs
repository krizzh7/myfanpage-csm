import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4179';
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = path.join(os.tmpdir(), `csm-fanpage-${process.pid}`);
const chromeProcess = spawn(chrome, [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

let socket;
try {
  const activePortFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(activePortFile); i += 1) await delay(100);
  assert.ok(fs.existsSync(activePortFile), 'Chrome DevTools did not start');
  const port = fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' });
  assert.ok(targetResponse.ok, `Chrome target creation failed: ${targetResponse.status}`);
  const target = await targetResponse.json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails;
      runtimeErrors.push(`${detail.exception?.description ?? detail.text}${detail.stackTrace?.callFrames?.[0]?.url ? ` @ ${detail.stackTrace.callFrames[0].url}:${detail.stackTrace.callFrames[0].lineNumber + 1}` : ''}`);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      runtimeErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    }
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(`Browser evaluation failed: ${detail}`);
    }
    return result.result.value;
  };
  const clickElement = async (selector) => {
    const rect = await evaluate(`document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect().toJSON()`);
    assert.ok(rect, `Element not found for click: ${selector}`);
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: baseUrl });
  let mounted = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(500);
    mounted = await evaluate(`Boolean(document.querySelector('.hero h1') && document.querySelector('.loader-choice'))`);
    if (mounted) break;
  }

  const initial = await evaluate(`({
    title: document.title,
    heading: document.querySelector('.hero h1')?.innerText,
    chapterCount: document.querySelectorAll('.chapter').length,
    loadedBio: document.querySelector('.hero-description p')?.innerText,
    canvas: (() => { const c = document.querySelector('canvas'); return c ? { width: c.clientWidth, height: c.clientHeight } : null })(),
    normalCursor: document.querySelector('.cursor-normal')?.getAttribute('src'),
    hoverCursor: document.querySelector('.cursor-hover')?.getAttribute('src'),
    videoUrl: document.querySelector('.loader-video')?.getAttribute('src'),
    soundtrackUrl: document.querySelector('.site-audio')?.getAttribute('src'),
  })`);
  assert.equal(mounted, true, 'React app or entry choice did not render');
  assert.match(initial.title, /Chainsaw Man/i, 'Page title did not render');
  assert.match(initial.heading, /CHAINSAW[\s\S]*MAN/i, 'Hero title did not render');
  assert.equal(initial.chapterCount, 7, 'Expected all seven character chapters');
  assert.match(initial.loadedBio, /alternate reality|Devils are born/i, 'Series biography did not load');
  assert.ok(initial.canvas?.width > 0 && initial.canvas?.height > 0, 'R3F canvas is missing or has no drawing area');
  assert.equal(initial.normalCursor, '/csm/cource/ui/cursor_normal.png', 'Supplied normal cursor is not connected');
  assert.equal(initial.hoverCursor, '/csm/cource/ui/cursor_hover.png', 'Supplied hover cursor is not connected');
  assert.equal(initial.videoUrl, '/csm/cource/Assets/Chainsaw Man GTA IV Loading Screen.mp4', 'Loading video source is incorrect');
  assert.equal(initial.soundtrackUrl, '/csm/cource/Assets/Chainsaw Man GTA IV Loading Screen.mp3', 'Soundtrack source is incorrect');

  const mediaResponses = await Promise.all([initial.videoUrl, initial.soundtrackUrl].map(async (asset) => {
    const response = await fetch(new URL(asset, baseUrl));
    return { asset, status: response.status, length: Number(response.headers.get('content-length')) };
  }));
  assert.ok(mediaResponses.every((response) => response.status === 200 && response.length > 0), 'Loader media assets are not being served');
  const sourceDuration = await evaluate(`(async () => {
    const video = document.querySelector('.loader-video');
    if (video.readyState < 1) await new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }));
    return video.duration;
  })()`);
  assert.ok(sourceDuration <= 52, `Loading video exceeds the 52-second cap (${sourceDuration})`);

  await clickElement('.loader-button--primary');
  await delay(100);
  const started = await evaluate(`({
    choiceClosed: !document.querySelector('.loader-choice'),
    audioPlaying: Boolean(document.querySelector('.site-audio') && !document.querySelector('.site-audio').paused),
    musicPressed: document.querySelector('.music-toggle')?.getAttribute('aria-pressed'),
    videoPlaying: Boolean(document.querySelector('.loader-video') && !document.querySelector('.loader-video').paused),
  })`);
  assert.equal(started.choiceClosed, true, 'Entry prompt stayed open after choice');
  assert.equal(started.audioPlaying, true, 'Music did not start after explicit opt-in');
  assert.equal(started.musicPressed, 'true', 'Music toggle did not reflect opt-in');
  assert.equal(started.videoPlaying, true, 'Loading video did not start after explicit entry');

  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 40, y: 40 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 40, y: 40, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 40, y: 40, button: 'left', clickCount: 1 });
  await delay(300);
  const exitChoice = await evaluate(`Boolean(document.querySelector('.loader-choice--exit'))`);
  assert.equal(exitChoice, true, 'Clicking the loading screen did not open its exit choice');
  await clickElement('.loader-choice--exit .loader-button:not(.loader-button--primary)');
  assert.equal(await evaluate(`!document.querySelector('.loader-choice--exit')`), true, 'Keep watching did not dismiss the exit choice');
  await clickElement('.loading-screen');
  await clickElement('.loader-choice--exit .loader-button--primary');
  await delay(700);

  const mainPage = await evaluate(`({
    loaderClosed: !document.querySelector('.loading-screen'),
    chapters: document.querySelectorAll('.chapter').length,
    chapterText: document.querySelector('.chapter-bio')?.innerText,
    scenePointerRouting: document.querySelector('.webgl-canvas') ? getComputedStyle(document.querySelector('.webgl-canvas')).pointerEvents : null,
    cursorOutsideMain: !document.querySelector('main')?.contains(document.querySelector('.custom-cursor')),
  })`);
  assert.equal(mainPage.loaderClosed, true, 'Exit action did not reveal the main page');
  assert.equal(mainPage.chapters, 7, 'Character sections changed after leaving the loader');
  assert.ok(mainPage.chapterText?.length > 15, 'Character bio copy is missing');
  assert.equal(mainPage.scenePointerRouting, 'auto', 'Canvas pointer events are not enabled');
  assert.equal(mainPage.cursorOutsideMain, true, 'Custom cursor is trapped inside the main stacking context');

  const viewport = await evaluate(`({ width: innerWidth, height: innerHeight })`);
  const cursorPoint = { x: Math.round(viewport.width * 0.52), y: Math.round(viewport.height * 0.48) };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...cursorPoint });
  await delay(450);
  const normalCursorState = await evaluate(`(() => {
    const cursor = document.querySelector('.custom-cursor');
    const position = cursor?.querySelector('.cursor-position');
    const image = position?.querySelector('.cursor-normal');
    const rect = image?.getBoundingClientRect();
    const style = image && getComputedStyle(image);
    return {
      mounted: Boolean(cursor),
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      visible: Boolean(rect && rect.width >= 48 && rect.height >= 48 && style.opacity !== '0' && style.visibility !== 'hidden'),
      opacity: style?.opacity,
      cssWidth: style?.width,
      cssHeight: style?.height,
      offsetWidth: image?.offsetWidth,
      offsetHeight: image?.offsetHeight,
      transform: style?.transform,
      width: rect?.width,
      height: rect?.height,
      x: rect?.x,
      y: rect?.y,
      zIndex: cursor && getComputedStyle(cursor).zIndex,
    };
  })()`);
  if (process.env.CSM_SCREENSHOT_PATH) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(process.env.CSM_SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
  }
  assert.equal(normalCursorState.mounted, true, 'Custom cursor did not mount on the main page');
  assert.equal(normalCursorState.imageLoaded, true, 'Normal cursor image did not load');
  assert.equal(normalCursorState.visible, true, `Normal cursor is not visibly rendered at an adequate size (${JSON.stringify(normalCursorState)})`);
  assert.ok(Math.abs(normalCursorState.x - cursorPoint.x) < 60, `Normal cursor did not follow pointer X (${normalCursorState.x})`);
  assert.ok(Math.abs(normalCursorState.y - cursorPoint.y) < 60, `Normal cursor did not follow pointer Y (${normalCursorState.y})`);
  if (process.env.CSM_SCREENSHOT_PATH) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(process.env.CSM_SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
  }

  const musicOff = await (async () => {
    await clickElement('.music-toggle');
    await delay(120);
    return evaluate(`({ paused: document.querySelector('.site-audio').paused, pressed: document.querySelector('.music-toggle')?.getAttribute('aria-pressed') })`);
  })();
  assert.equal(musicOff.paused, true, 'Music toggle did not pause the soundtrack');
  assert.equal(musicOff.pressed, 'false', 'Music toggle did not update its accessible state');
  await clickElement('.music-toggle');
  await delay(120);
  const musicOn = await evaluate(`({ paused: document.querySelector('.site-audio').paused, pressed: document.querySelector('.music-toggle')?.getAttribute('aria-pressed') })`);
  assert.equal(musicOn.paused, false, 'Music toggle did not resume the soundtrack');
  assert.equal(musicOn.pressed, 'true', 'Music toggle did not update when music resumed');

  const interactive = await evaluate(`document.querySelector('.header-link').getBoundingClientRect().toJSON()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: interactive.x + interactive.width / 2, y: interactive.y + interactive.height / 2 });
  await delay(350);
  const hoverCursorState = await evaluate(`(() => {
    const cursor = document.querySelector('.cursor-position');
    const image = cursor?.querySelector('.cursor-hover');
    const rect = image?.getBoundingClientRect();
    return {
      engaged: cursor?.classList.contains('is-engaged') ?? false,
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      visible: Boolean(rect && getComputedStyle(image).opacity !== '0'),
      x: rect?.x,
      y: rect?.y,
    };
  })()`);
  assert.equal(hoverCursorState.engaged, true, 'Hover cursor did not activate over an interactive link');
  assert.equal(hoverCursorState.imageLoaded, true, 'Hover cursor image did not load');
  assert.equal(hoverCursorState.visible, true, 'Hover cursor image is not visible');
  assert.ok(Math.abs(hoverCursorState.x - interactive.x - interactive.width / 2) < 60, 'Hover cursor did not follow pointer X');
  assert.ok(Math.abs(hoverCursorState.y - interactive.y - interactive.height / 2) < 60, 'Hover cursor did not follow pointer Y');

  await evaluate(`(() => {
    const section = document.querySelector('#aki');
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
  })()`);
  await delay(1500);
  const chapterView = await evaluate(`({
    activeTop: document.querySelector('#aki')?.getBoundingClientRect().top,
    bioOpacity: getComputedStyle(document.querySelector('#aki .chapter-bio')).opacity,
    titleOpacity: getComputedStyle(document.querySelector('#aki h2')).opacity,
    accent: getComputedStyle(document.querySelector('#aki .eyebrow i')).backgroundColor,
    bioText: document.querySelector('#aki .chapter-bio')?.innerText,
  })`);
  assert.ok(Math.abs(chapterView.activeTop) < 3, `Aki chapter was not brought to its pinned frame (top: ${chapterView.activeTop})`);
  assert.notEqual(chapterView.bioOpacity, '0', 'Chapter bio is hidden while its frame is active');
  assert.notEqual(chapterView.titleOpacity, '0', 'Chapter title is hidden while its frame is active');
  assert.match(chapterView.accent, /^rgb\(\s*145,\s*162,\s*175\s*\)$/i, `Aki accent color missing or invalid (${chapterView.accent})`);
  assert.ok(chapterView.bioText?.length > 15, 'Biography copy was not visible while the pinned frame was active');

  const canvasRect = await evaluate(`document.querySelector('.webgl-canvas').getBoundingClientRect().toJSON()`);
  const portraitCandidates = [];
  for (let y = 0.20; y <= 0.90; y += 0.06) {
    for (let x = 0.36; x <= 0.96; x += 0.05) {
      portraitCandidates.push({ x: Math.round(canvasRect.x + canvasRect.width * x), y: Math.round(canvasRect.y + canvasRect.height * y) });
    }
  }
  let lightboxVisible = false;
  for (const candidate of portraitCandidates) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: candidate.x, y: candidate.y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: candidate.x, y: candidate.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: candidate.x, y: candidate.y, button: 'left', clickCount: 1 });
    await delay(80);
    lightboxVisible = await evaluate(`Boolean(document.querySelector('.image-lightbox img'))`);
    if (lightboxVisible) break;
  }
  assert.equal(lightboxVisible, true, 'Clicking a portrait in the active chapter should open the enlarged image');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1 });
  await delay(300);
  const lightboxDismissed = await evaluate(`Boolean(!document.querySelector('.image-lightbox'))`);
  assert.equal(lightboxDismissed, true, 'Clicking the lightbox backdrop should dismiss the enlarged image');

  assert.deepEqual(runtimeErrors, [], `Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  console.log(JSON.stringify({ status: 'passed', initial, sourceDuration, started, exitChoice, mainPage, normalCursorState, hoverCursorState, musicOff, musicOn, chapterView, lightboxTest: { openedAfterPortraitClick: lightboxVisible, closedAfterBackdropClick: lightboxDismissed }, runtimeErrors }, null, 2));
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  if (chromeProcess.exitCode === null) {
    chromeProcess.kill();
    await Promise.race([
      new Promise((resolve) => chromeProcess.once('exit', resolve)),
      delay(3000),
    ]);
  }
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
  }
}
