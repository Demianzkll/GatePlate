import threading
import time
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework import status
from rest_framework.response import Response

from .models import DetectedPlate, Vehicle, Camera, BlackList, Employee, Department
from .serializers import DetectedPlateSerializer, EmployeeSerializer, DepartmentSerializer
from scripts.vision_engine import VisionEngine

# Глобальні сховища
active_analyzers = {}
live_previews = {}
temp_best_frames = {}

# --- VISION ENGINE VIEWS ---

class AnalysisStartView(APIView):
    def get(self, request):
        video_name = request.query_params.get('video', '')
        if video_name and video_name not in active_analyzers:
            engine = VisionEngine(
                video_name=video_name, 
                live_dict=live_previews, 
                cache_dict=temp_best_frames
            )
            thread = threading.Thread(target=engine.run)
            thread.daemon = True
            active_analyzers[video_name] = thread
            thread.start()
            
            def cleanup():
                thread.join()
                active_analyzers.pop(video_name, None)
            
            threading.Thread(target=cleanup).start()
            return Response({"status": "VisionEngine started"})
        return Response({"status": "Already running"})

class LiveUpdateView(APIView):
    def get(self, request):
        video_name = request.query_params.get('video', '')
        data = live_previews.get(video_name)
        if data and data.get('is_finished'):
            def delayed_clear():
                time.sleep(5)
                live_previews.pop(video_name, None)
            threading.Thread(target=delayed_clear).start()
        return Response(data)

class PlateConfirmView(APIView):
    def post(self, request):
        data = request.data
        plate_text = data.get('plate')
        video_name = data.get('video_name')
        temp_data = temp_best_frames.get(video_name)
        
        if not temp_data:
            return Response({"error": "No cached data found"}, status=status.HTTP_400_BAD_REQUEST)

        camera_obj, _ = Camera.objects.get_or_create(name=f"Камера: {video_name}")
        vehicle_obj = Vehicle.objects.filter(license_plate=plate_text).first()
        
        new_record = DetectedPlate.objects.create(
            camera=camera_obj,
            plate_number=plate_text,
            confidence=temp_data.get('conf', 0.0),
            status="дозволено" if vehicle_obj else "невідомо"
        )

        if 'image_content' in temp_data:
            new_record.image.save(f"{plate_text}_manual.jpg", temp_data['image_content'], save=True)

        live_previews.pop(video_name, None)
        temp_best_frames.pop(video_name, None)
        return Response({"status": "saved"})

# --- EMPLOYEE CRUD VIEWS ---

class EmployeeListCreateView(ListCreateAPIView):
    queryset = Employee.objects.all().order_by('-id')
    serializer_class = EmployeeSerializer

class EmployeeDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

# --- DEPARTMENT VIEWS ---

class DepartmentListView(APIView):
    """Повертає всі відділи для вибору в модальному вікні"""
    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

# --- DETECTED PLATES VIEW (Додано для виправлення помилки) ---

class DetectedPlateListView(APIView):
    """Повертає історію розпізнаних номерів"""
    def get(self, request):
        plates = DetectedPlate.objects.all().order_by('-timestamp')[:10]
        serializer = DetectedPlateSerializer(plates, many=True)
        return Response(serializer.data)

# --- OTHER ---

class VehicleStatusUpdateView(APIView):
    def post(self, request):
        plate = request.data.get('plate')
        action = request.data.get('action') 
        if action == 'to_black':
            BlackList.objects.get_or_create(plate_text=plate)
            return Response({"status": "blocked"})
        elif action == 'to_white':
            BlackList.objects.filter(plate_text=plate).delete()
            return Response({"status": "unblocked"})
        return Response({"error": "Invalid action"}, status=400)