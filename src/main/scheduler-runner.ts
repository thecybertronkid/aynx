import { getScheduledDownloads, saveScheduledDownload, ScheduledDownloadRecord } from './database';
import { queueDownload } from './download-engine';
import { exec } from 'child_process';
import { shell } from 'electron';

let checkInterval: NodeJS.Timeout | null = null;
const lastTriggeredMap = new Map<string, string>();

export function startScheduler() {
  if (checkInterval) return;

  console.log('[Scheduler] Background service started.');

  checkInterval = setInterval(async () => {
    try {
      const scheduled = await getScheduledDownloads();
      const now = new Date();
      
      for (const task of scheduled) {
        if (task.status !== 'active') continue;

        let shouldTrigger = false;
        const taskTime = new Date(task.scheduledTime);

        if (task.repeatMode === 'once') {
          if (now >= taskTime) {
            shouldTrigger = true;
            task.status = 'completed';
            await saveScheduledDownload(task);
          }
        } else if (task.repeatMode === 'daily') {
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const targetHour = taskTime.getHours();
          const targetMin = taskTime.getMinutes();

          if (currentHour === targetHour && currentMin === targetMin) {
            const dateStr = now.toDateString();
            if (lastTriggeredMap.get(task.id) !== dateStr) {
              shouldTrigger = true;
              lastTriggeredMap.set(task.id, dateStr);
            }
          }
        } else if (task.repeatMode === 'weekly') {
          if (now.getDay() === taskTime.getDay()) {
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const targetHour = taskTime.getHours();
            const targetMin = taskTime.getMinutes();

            if (currentHour === targetHour && currentMin === targetMin) {
              const dateStr = now.toDateString();
              if (lastTriggeredMap.get(task.id) !== dateStr) {
                shouldTrigger = true;
                lastTriggeredMap.set(task.id, dateStr);
              }
            }
          }
        } else if (task.repeatMode === 'monthly') {
          if (now.getDate() === taskTime.getDate()) {
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const targetHour = taskTime.getHours();
            const targetMin = taskTime.getMinutes();

            if (currentHour === targetHour && currentMin === targetMin) {
              const dateStr = now.toDateString();
              if (lastTriggeredMap.get(task.id) !== dateStr) {
                shouldTrigger = true;
                lastTriggeredMap.set(task.id, dateStr);
              }
            }
          }
        }

        if (shouldTrigger) {
          console.log(`[Scheduler] Triggering scheduled download: "${task.title}"`);
          
          const uniqueId = `${task.id}_${Date.now()}`;
          await queueDownload({
            id: uniqueId,
            url: task.url,
            title: task.title,
            platform: task.platform,
            contentType: task.contentType as 'video' | 'audio' | 'image',
            quality: task.quality,
            format: task.format
          });

          if (task.postAction && task.postAction !== 'none') {
            monitorDownloadAndRunPostAction(uniqueId, task.postAction);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error running tick:', err);
    }
  }, 10000); // Checks every 10 seconds
}

export function stopScheduler() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function monitorDownloadAndRunPostAction(uniqueId: string, action: string) {
  const check = setInterval(async () => {
    try {
      const { getDownloads } = await import('./database');
      const downloads = await getDownloads();
      const target = downloads.find(d => d.id === uniqueId);
      if (target) {
        if (target.status === 'completed') {
          clearInterval(check);
          console.log(`[Scheduler] Download completed for ${uniqueId}. Action: ${action}`);
          executeAction(action, target.filePath);
        } else if (target.status === 'failed') {
          clearInterval(check);
          console.log(`[Scheduler] Download failed for ${uniqueId}. Aborting post action.`);
        }
      }
    } catch (err) {
      clearInterval(check);
    }
  }, 5000);
}

function executeAction(action: string, filePath?: string) {
  switch (action) {
    case 'shutdown':
      exec('shutdown /s /f /t 10');
      break;
    case 'sleep':
      exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
      break;
    case 'hibernate':
      exec('rundll32.exe powrprof.dll,SetSuspendState 1,1,0');
      break;
    case 'lock':
      exec('rundll32.exe user32.dll,LockWorkStation');
      break;
    case 'close':
      const { app } = require('electron');
      app.quit();
      break;
    case 'sound':
      // standard sound notification trigger
      const path = require('path');
      const soundPath = path.join(process.resourcesPath || __dirname, '../../resources/beep.mp3');
      shell.openPath(soundPath).catch(() => {});
      break;
    case 'folder':
      if (filePath) {
        shell.showItemInFolder(filePath);
      }
      break;
    case 'player':
      if (filePath) {
        shell.openPath(filePath).catch(() => {});
      }
      break;
    default:
      break;
  }
}
