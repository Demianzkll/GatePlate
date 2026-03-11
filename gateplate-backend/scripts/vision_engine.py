import numpy as np
import os
import cv2
import pytesseract
import re
from ultralytics import YOLO
from django.utils import timezone
from django.core.files.base import ContentFile
from django.conf import settings
from datetime import timedelta

from recognition.models import DetectedPlate, Camera, Vehicle, AccessPermit, BlackList


class VisionEngine:
    def __init__(self, video_name=None, live_dict=None, cache_dict=None, model_name='best.pt'):
        self.video_name = video_name
        self.live_dict = live_dict    
        self.cache_dict = cache_dict  
        
        model_path = os.path.join(settings.BASE_DIR, 'ai_models', model_name)
        self.model = YOLO(model_path)
        self.frame_step = 10
        self.best_results = {}

    def _validate_plate(self, text):
            if not text: return None
            
            # 1. Лишаємо тільки А-Z та 0-9
            clean_text = "".join(re.findall(r'[A-Z0-9]', text.upper()))
            
            # 2. ФІКС ДЛЯ ПРАПОРА: Якщо 9 символів і перший 'M' або 'W' — видаляємо його
            if len(clean_text) == 9 and clean_text[0] in ['M', 'W']:
                clean_text = clean_text[1:]
                print(f"[FIX] Видалено шум прапора: {clean_text}")

            if len(clean_text) != 8: 
                return None

            chars = list(clean_text)
            
            # 3. КАРТА КОРЕКЦІЇ (Додаємо 0 -> O для країв та O -> 0 для центру)
            letter_map = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
            digit_map = {'O': '0', 'D': '0', 'Q': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8'}

            # Позиції літер (XX .... XX) -> індекси 0,1 та 6,7
            for i in [0, 1, 6, 7]:
                if chars[i] in letter_map:
                    chars[i] = letter_map[chars[i]]
                
            # Позиції цифр (.. 0000 ..) -> індекси 2,3,4,5
            for i in range(2, 6):
                if chars[i] in digit_map:
                    chars[i] = digit_map[chars[i]]

            final_text = "".join(chars)

            # 4. Перевірка шаблоном
            if re.match(r'^[A-Z]{2}\d{4}[A-Z]{2}$', final_text):
                return final_text
            
            return None
    

    def _detect_and_ocr(self, frame):
        """Уніфікований метод розпізнавання (взято з твого старого коду)"""
        results = self.model(frame, verbose=False)
        best_plate = None
        max_conf = 0

        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                if conf < 0.4: continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_roi = frame[y1:y2, x1:x2]
                
                if plate_roi.size > 0:
                    # Покращення зображення (як у твоєму старому коді)
                    gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
                    resized = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
                    
                    raw_text = pytesseract.image_to_string(
                        resized, 
                        config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                    ).strip()
                    
                    plate_text = self._validate_plate(raw_text)
                    if plate_text and conf > max_conf:
                        max_conf = conf
                        best_plate = plate_text

        return best_plate, max_conf

    def analyze_single_photo(self, image_file):
        """ГОЛОВНИЙ МЕТОД ДЛЯ СТОРІНКИ ФОТО-АНАЛІЗУ"""
        # 1. Читаємо файл з пам'яті в формат OpenCV
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None: return {"error": "Не вдалося прочитати зображення"}

        # 2. Шукаємо номер через YOLO
        results = self.model(img, verbose=False)
        best_plate = None
        max_conf = 0

        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_roi = img[y1:y2, x1:x2]
                
                # 3. Розпізнаємо текст
                plate_text = self._process_roi(plate_roi)
                if plate_text and conf > max_conf:
                    max_conf = conf
                    best_plate = plate_text

        if not best_plate:
            return {"plate_text": "Не розпізнано", "confidence": 0, "is_known": False}

        # 4. Перевірка в базі
        vehicle = Vehicle.objects.filter(plate_text=best_plate).first()
        
        return {
            "plate_text": best_plate,
            "confidence": max_conf,
            "is_known": vehicle is not None,
            "owner_name": f"{vehicle.employee.first_name} {vehicle.employee.last_name}" if vehicle and vehicle.employee else "Невідомий",
            "owner_phone": vehicle.employee.phone if vehicle and vehicle.employee else "---"
        }
    

    def check_access(self, plate_text):
        """Перевірка статусу доступу в БД"""
        try:
            if BlackList.objects.filter(plate_text=plate_text).exists():
                return 'blocked', "ОБ'ЄКТ ЗАБЛОКОВАНО"
            
            vehicle = Vehicle.objects.filter(plate_text=plate_text).first()
            if vehicle:
                permit = AccessPermit.objects.filter(vehicle=vehicle, is_allowed=True).first()
                if permit and (not permit.end_date or permit.end_date >= timezone.now().date()):
                    # Перевірка наявності employee для уникнення помилки Attribute Error
                    name = vehicle.employee.last_name if hasattr(vehicle, 'employee') and vehicle.employee else "Співробітник"
                    return 'allowed', f"ДОЗВОЛЕНО: {name}"
                return 'denied', "ЗАБОРОНЕНО: Немає дозволу"
                
            return 'guest', "ГІСТЬ (НЕВІДОМИЙ)"
        except Exception as e:
            print(f"[ERROR] Помилка перевірки доступу: {e}")
            return 'guest', "Помилка бази даних"



    def _process_roi(self, plate_roi):
            """Метод з детальним виводом у консоль для відладки"""
            if plate_roi.size == 0: 
                return None
            
            # 1. Препроцесинг
            gray = cv2.cvtColor(plate_roi, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
            _, thresh = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # 2. Отримуємо текст від Tesseract
            raw_text = pytesseract.image_to_string(
                thresh, 
                config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            ).strip()

            # --- ЦЕЙ БЛОК ВИВОДИТЬ ДАНІ В КОНСОЛЬ DJANGO ---
            print("-" * 30)
            print(f"[AI RAW]: '{raw_text}'") # Те, що побачив Tesseract
            
            # Очищуємо від сміття (пробіли, невидимі символи)
            clean_attempt = "".join(re.findall(r'[A-Z0-9]', raw_text.upper()))
            print(f"[AI CLEAN]: '{clean_attempt}' (Довжина: {len(clean_attempt)})")
            
            # Пробуємо валідувати
            valid_text = self._validate_plate(raw_text)
            
            if valid_text:
                print(f"[AI RESULT]: ✅ Валідний номер: {valid_text}")
            else:
                print(f"[AI RESULT]: ❌ Не пройшов валідацію шаблону")
            print("-" * 30)
            # ----------------------------------------------

            return valid_text

    def run(self):
        video_path = os.path.join(settings.BASE_DIR, 'videos', self.video_name)
        cap = cv2.VideoCapture(video_path)
        frame_id = 0
        was_auto_saved = False 

        while cap.isOpened() and not was_auto_saved:
            ret, frame = cap.read()
            if not ret or frame_id > 800: break 

            if frame_id % self.frame_step == 0:
                # Змінюємо stream=True на звичайний виклик для стабільності
                results = self.model(frame, verbose=False)
                
                for r in results:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        if conf < 0.4: continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        plate_roi = frame[y1:y2, x1:x2]
                        
                        # ВИКЛИКАЄМО НАШ НОВИЙ МЕТОД ОБРОБКИ
                        plate_text = self._process_roi(plate_roi)

                        if plate_text:
                            # --- ЛОГІКА МИТТЄВОГО АВТО-ЗБЕРЕЖЕННЯ (>= 80%) ---
                            if conf >= 0.8:
                                print(f"[!] Висока точність ({conf:.2f}). Авто-збереження...")
                                
                                camera_obj, _ = Camera.objects.get_or_create(name=f"Камера: {self.video_name}")
                                vehicle_obj = Vehicle.objects.filter(plate_text=plate_text).first()
                                
                                new_rec = DetectedPlate(
                                    camera=camera_obj,
                                    plate_text=plate_text,
                                    confidence=conf,
                                    vehicle=vehicle_obj
                                )
                                
                                _, buffer = cv2.imencode('.jpg', frame)
                                content = ContentFile(buffer.tobytes())
                                
                                filename = f"{plate_text}_{timezone.now().strftime('%H%M%S')}.jpg"
                                new_rec.image.save(filename, content, save=True)
                                
                                if self.live_dict is not None:
                                    self.live_dict[self.video_name] = {
                                        'plate': plate_text,
                                        'conf': conf,
                                        'needs_confirmation': False,
                                        'is_finished': True,
                                        'message': f"✅ АВТО-ПРОПУСК: {plate_text}"
                                    }
                                
                                was_auto_saved = True 
                                break 

                            # Оновлюємо live_dict для React
                            if self.live_dict is not None:
                                self.live_dict[self.video_name] = {
                                    'plate': plate_text,
                                    'conf': conf,
                                    'needs_confirmation': False,
                                    'is_finished': False,
                                    'message': "Аналізую... шукаю чіткий кадр"
                                }

                            # Оновлюємо кеш найкращих кадрів (для методу finalize)
                            if plate_text not in self.best_results or conf > self.best_results[plate_text]['conf']:
                                _, buffer = cv2.imencode('.jpg', frame)
                                self.best_results[plate_text] = {
                                    'conf': conf,
                                    'image_content': ContentFile(buffer.tobytes()),
                                    'timestamp': timezone.now()
                                }
                                
                    if was_auto_saved: break
            frame_id += 1
        
        cap.release()
        if not was_auto_saved:
            self.finalize()




    def finalize(self):
        """Фіналізація: автоматичний пропуск (>=80%) або ручний контроль (<80%)"""
        try:
            if not self.best_results:
                print("[!] Номерів не знайдено. Потік завершено.")
                if self.live_dict is not None:
                    self.live_dict.pop(self.video_name, None)
                return

            # Знаходимо найкращий результат за всю сесію відео
            top_plate, top_data = sorted(
                self.best_results.items(), 
                key=lambda x: x[1]['conf'], 
                reverse=True
            )[0]
            
            conf = top_data['conf']
            status, msg = self.check_access(top_plate)
            vehicle_obj = Vehicle.objects.filter(plate_text=top_plate).first()

            # --- СЦЕНАРІЙ 1: ВИСОКА ТОЧНІСТЬ (АВТОМАТИКА) ---
            if conf >= 0.8:
                # Створюємо запис у БД без участі користувача
                camera_obj, _ = Camera.objects.get_or_create(name=f"Камера: {self.video_name}")
                
                new_rec = DetectedPlate.objects.create(
                    camera=camera_obj,
                    plate_text=top_plate,
                    confidence=conf,
                    vehicle=vehicle_obj
                )
                # Зберігаємо фото кадру
                new_rec.image.save(f"{top_plate}_auto.jpg", top_data['image_content'], save=True)
                
                # Надсилаємо статус у React (без прапорця needs_confirmation)
                if self.live_dict is not None:
                    self.live_dict[self.video_name] = {
                        'plate': top_plate,
                        'conf': conf,
                        'needs_confirmation': False, # Кнопки не з'являться
                        'message': f"✅ АВТО-ПРОПУСК: {top_plate} ({int(conf*100)}%)"
                    }
                print(f"[*] [AUTO-SAVE] Номер {top_plate} збережено автоматично (Confidence: {conf:.2f})")

            # --- СЦЕНАРІЙ 2: НИЗЬКА ТОЧНІСТЬ (РУЧНИЙ КОНТРОЛЬ) ---
            else:
                # Зберігаємо дані в тимчасовий кеш для подальшого підтвердження через API
                if self.cache_dict is not None:
                    self.cache_dict[self.video_name] = top_data
                
                # Надсилаємо статус у React з вимогою підтвердження
                if self.live_dict is not None:
                    self.live_dict[self.video_name] = {
                        'plate': top_plate,
                        'conf': conf,
                        'access_type': status,
                        'needs_confirmation': True, # У React з'являться кнопки редагування
                        'message': f"⚠️ Низька точність ({int(conf*100)}%). Перевірте правильність!"
                    }
                print(f"[*] [MANUAL-REQUIRED] Номер {top_plate} очікує підтвердження (Confidence: {conf:.2f})")

        except Exception as e:
            print(f"[ERROR] Помилка у фіналізації: {e}")