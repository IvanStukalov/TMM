import asyncio
import websockets
import numpy as np
import cv2
import dlib
from imutils import face_utils
import math
import base64
from flask import Flask, render_template
import json

app = Flask(__name__)

HOST = "192.168.244.153"
BLINK_RATIO_THRESHOLD = 4

# Функции для вычисления коэффициента моргания
def midpoint(point1, point2):
    return (point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2

def euclidean_distance(point1, point2):
    return math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)

def get_blink_ratio(eye_points, landmarks):
    corner_left = (landmarks[eye_points[0]][0], landmarks[eye_points[0]][1])
    corner_right = (landmarks[eye_points[3]][0], landmarks[eye_points[3]][1])

    center_top = midpoint(landmarks[eye_points[1]], landmarks[eye_points[2]])
    center_bottom = midpoint(landmarks[eye_points[5]], landmarks[eye_points[4]])

    horizontal_length = euclidean_distance(corner_left, corner_right)
    vertical_length = euclidean_distance(center_top, center_bottom)

    ratio = horizontal_length / vertical_length
    return ratio

# Инициализация детектора лиц и предсказателя
p = "shape_predictor_68_face_landmarks.dat"
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(p)

left_eye_landmarks = [36, 37, 38, 39, 40, 41]
right_eye_landmarks = [42, 43, 44, 45, 46, 47]

@app.route('/')
def index():
    return render_template('index.html')

async def process_video(websocket, path):
    cap = cv2.VideoCapture(0)

    while True:
        # Декодирование полученного изображения
        res,image = cap.read()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        rects = detector(gray, 0)

        eyeClose = False

        for (i, rect) in enumerate(rects):
            shape = predictor(gray, rect)
            shape = face_utils.shape_to_np(shape)

            left_eye_ratio = get_blink_ratio(left_eye_landmarks, shape)
            right_eye_ratio = get_blink_ratio(right_eye_landmarks, shape)
            blink_ratio = (left_eye_ratio + right_eye_ratio) / 2

            for (x, y) in shape:
                cv2.circle(image, (x, y), 2, (0, 255, 0), -1)

            if blink_ratio > BLINK_RATIO_THRESHOLD:
                eyeClose = True

        _, buffer = cv2.imencode('.jpg', image)
        frame = base64.b64encode(buffer).decode('utf-8')
        # Создание словаря с данными для отправки
        data_to_send = {
            "image": f"data:image/jpeg;base64,{frame}",
            "eyeClose": eyeClose,
        }

        # Преобразование словаря в JSON строку
        json_data = json.dumps(data_to_send)

        # Отправка JSON строки через веб-сокет
        await websocket.send(json_data)


start_server = websockets.serve(process_video, HOST, 8080)

if __name__ == '__main__':
    print("start")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(start_server)
    loop.run_forever()
