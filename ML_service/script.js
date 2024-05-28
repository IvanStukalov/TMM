const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const output = document.getElementById('output');
const context = canvas.getContext('2d');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/static/js/service-worker.js')
    .then(function (registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    }).catch(function (error) {
      console.log('Service Worker registration failed:', error);
    });
}

const host = "192.168.244.153";

const serverUrl = `ws://${host}:8080`;

async function startVideo() {
  try {
    console.log("navigator", navigator)
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    startStreaming();
  } catch (error) {
    console.error('Error accessing camera:', error);
  }
}

function startStreaming() {
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

  websocket.onmessage = (event) => {
    output.src = event.data;
  };

  video.addEventListener('play', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setInterval(() => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(imageData);
      }
    }, 100); // Отправка каждые 100ms
  });
}

startVideo();
