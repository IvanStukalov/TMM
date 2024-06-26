const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const output = document.getElementById('output');
const blinkFreqDiv = document.getElementById('blink_frequence');
const context = canvas.getContext('2d');

const SECOND = 1000;
const FRAME_WIDTH = 10; // in seconds

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('static/js/service-worker.js')
    .then(function (registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    }).catch(function (error) {
      console.log('Service Worker registration failed:', error);
    });
}

// 192.168.244.153
const host = "192.168.244.153";

const serverUrl = `ws://${host}:8080`;

function startStreaming() {
  let closed = false;
  const timeFrame = [];

  const websocket = new WebSocket(serverUrl);

  websocket.onopen = () => {
    console.log('Connected to server');
  };

  websocket.onclose = () => {
    console.log('Disconnected from server');
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  /**
   * event.data = {
   *  image: blob,
   *  eyeClose: bool,
   * }
   */
  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    output.src = data.image;

    const currentTime = new Date();
    if (closed && !data.eyeClose) {
      console.log("BLINK")
      timeFrame.push(currentTime);
    }
    closed = data.eyeClose

    for (let i in timeFrame) {
      if (currentTime - timeFrame[i] > FRAME_WIDTH * SECOND) {
        timeFrame.shift();
      } else {
        break;
      }
    }

    const freq = timeFrame.length || 0;
    blinkFreqDiv.textContent = `${freq} в ${FRAME_WIDTH} сек`;
  };

  setInterval(() => {
    if (websocket.readyState === WebSocket.OPEN) {
      console.log("aaaaa")
      
      websocket.send("aaaaa");
    }
  }, 100); // Отправка каждые 100ms
}

startStreaming();
