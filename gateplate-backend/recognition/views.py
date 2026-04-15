import os
import threading
import time
from datetime import timedelta
import hmac
import hashlib
import psutil

from django.contrib.auth.models import User

from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from scripts.vision_engine import VisionEngine

from .models import (
    PaymentTransaction,
    APIKey,
    BlackList,
    Camera,
    Department,
    DetectedPlate,
    Employee,
    UserProfile,
    Vehicle,
)
from .serializers import (
    CameraSerializer,
    DepartmentSerializer,
    DetectedPlateSerializer,
    EmployeeSerializer,
    UserSerializer,
    VehicleSerializer,
)

# Глобальні сховища
active_analyzers = {}
live_previews = {}
temp_best_frames = {}

# Глобальна конфігурація
engine_config = {
    "frame_step": 10,
}


class WayForPayCreatePaymentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        api_key = APIKey.objects.filter(user=user).first()
        
        if not api_key:
            return Response({"error": "API Key not found"}, status=404)

        merchant_account = settings.WAYFORPAY_ACCOUNT
        merchant_key = settings.WAYFORPAY_SECRET_KEY
        domain = settings.WAYFORPAY_DOMAIN
        
        # Створюємо унікальний order_id
        order_id = f"{api_key.id}_{int(time.time())}"
        order_date = int(time.time())
        amount = 500
        currency = "UAH"
        product_name = "GatePlate 1000 Requests"
        
        # 1. СТВОРЮЄМО ЗАПИС ПРО ТРАНЗАКЦІЮ В БАЗІ
        PaymentTransaction.objects.create(
            user=user,
            api_key=api_key,
            order_reference=order_id,
            amount=amount,
            currency=currency,
            status='pending'
        )
        
        # Параметри для підпису
        params = [
            merchant_account, domain, order_id, order_date, 
            amount, currency, product_name, 1, amount
        ]
        
        base_string = ";".join(map(str, params))
        signature = hmac.new(
            merchant_key.encode('utf-8'), 
            base_string.encode('utf-8'), 
            hashlib.md5
        ).hexdigest()

        payment_data = {
            "merchantAccount": merchant_account,
            "merchantDomainName": domain,
            "orderReference": order_id,
            "orderDate": order_date,
            "amount": amount,
            "currency": currency,
            "productName[]": [product_name],
            "productCount[]": [1],
            "productPrice[]": [amount],
            "merchantSignature": signature,
            "serviceUrl": "https://unreconcilably-unpicaresque-raul.ngrok-free.dev/api/recognition/payment/webhook/",
        }

        return Response(payment_data)

class WayForPayWebhookAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data
        order_ref = data.get('orderReference')
        
        # 2. ШУКАЄМО ТРАНЗАКЦІЮ В БАЗІ
        try:
            transaction = PaymentTransaction.objects.get(order_reference=order_ref)
        except PaymentTransaction.DoesNotExist:
            return Response({"status": "error", "message": "Transaction not found"}, status=404)

        # Якщо транзакція вже була успішно оброблена раніше, просто відповідаємо "accept"
        if transaction.status == 'approved':
            return Response({"status": "accept"})

        if data.get('transactionStatus') == 'Approved':
            try:
                api_key = transaction.api_key
                
                # Нарахування лімітів
                api_key.requests_limit += 1000
                
                if api_key.expires_at and api_key.expires_at > timezone.now():
                    api_key.expires_at += timedelta(days=30)
                else:
                    api_key.expires_at = timezone.now() + timedelta(days=30)
                
                api_key.is_active = True
                api_key.save()
                
                # 3. ОНОВЛЮЄМО СТАТУС ТРАНЗАКЦІЇ
                transaction.status = 'approved'
                transaction.save()
                
                return Response({"status": "accept"})
            except Exception as e:
                transaction.status = 'error'
                transaction.save()
                return Response({"status": "error"}, status=500)
        
        else:
            # Оплата відхилена банком або скасована
            transaction.status = 'declined'
            transaction.save()
        
        return Response({"status": "decline"})



class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        # 1. Перевіряємо логін і пароль
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # 2. Отримуємо або створюємо токен
        token, created = Token.objects.get_or_create(user=user)

        # 3. ДІЗНАЄМОСЯ РОЛЬ (ГРУПУ) КОРИСТУВАЧА
        user_role = "Guest"  # За замовчуванням
        if user.groups.exists():
            user_role = (
                user.groups.first().name
            )  # Беремо назву першої групи (напр. 'Operators')

        # 4. Відправляємо React-у розширену відповідь!
        return Response(
            {
                "token": token.key,
                "user_id": user.pk,
                "username": user.username,
                "role": user_role,
            }
        )


# --- ПРАВА ДОСТУПУ (PERMISSIONS) ---


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return (
            request.user.is_staff
            or request.user.groups.filter(
                name__in=["Administrators", "Operators"]
            ).exists()
        )


# --- AUTH VIEWS ---


class RegisterUserView(generics.CreateAPIView):
    """Реєстрація нового гостя"""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]

    serializer_class = UserSerializer


# --- VISION ENGINE VIEWS ---


class AnalysisStartView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        video_name = request.query_params.get("video", "")
        if video_name and video_name not in active_analyzers:
            engine = VisionEngine(
                video_name=video_name,
                live_dict=live_previews,
                cache_dict=temp_best_frames,
                frame_step=engine_config["frame_step"],
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        video_name = request.query_params.get("video", "")
        data = live_previews.get(video_name)
        if data and data.get("is_finished"):

            def delayed_clear():
                time.sleep(5)
                live_previews.pop(video_name, None)

            threading.Thread(target=delayed_clear).start()
        return Response(data)


class PlateConfirmView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        data = request.data
        plate_text = data.get("plate")
        video_name = data.get("video_name")
        temp_data = temp_best_frames.get(video_name)

        if not temp_data:
            return Response(
                {"error": "No cached data found"}, status=status.HTTP_400_BAD_REQUEST
            )

        camera_obj, _ = Camera.objects.get_or_create(name=f"Камера: {video_name}")

        vehicle_obj = Vehicle.objects.filter(plate_text=plate_text).first()

        new_record = DetectedPlate.objects.create(
            camera=camera_obj,
            plate_text=plate_text,
            confidence=temp_data.get("conf", 0.0),
            vehicle=vehicle_obj,
        )

        if "image_content" in temp_data:
            new_record.image.save(
                f"{plate_text}_manual.jpg", temp_data["image_content"], save=True
            )

        live_previews.pop(video_name, None)
        temp_best_frames.pop(video_name, None)

        return Response({"status": "saved"})


# --- EMPLOYEE CRUD VIEWS ---


class EmployeeListCreateView(generics.ListCreateAPIView):
    queryset = Employee.objects.all().order_by("-id")
    serializer_class = EmployeeSerializer
    permission_classes = [IsStaffUser]


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsStaffUser]


# --- DEPARTMENT VIEWS ---


class DepartmentListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


# --- DETECTED PLATES VIEW ---


class DetectedPlateListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        plates = DetectedPlate.objects.all().order_by("-timestamp")[:10]
        serializer = DetectedPlateSerializer(plates, many=True)
        return Response(serializer.data)


# --- VEHICLE VIEWS ---


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_permissions(self):
        if self.action == "check_plate":
            return [permissions.IsAuthenticated()]
        return [IsStaffUser()]

    @action(detail=False, methods=["get"])
    def check_plate(self, request):
        plate = request.query_params.get("plate", "").upper().strip()
        if not plate:
            return Response(
                {"error": "Номер не вказано"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            vehicle = Vehicle.objects.get(plate_text=plate)
            serializer = self.get_serializer(vehicle)
            return Response(
                {
                    "access": True,
                    "message": "АВТОПРОПУСК ДОЗВОЛЕНО",
                    "data": serializer.data,
                }
            )
        except Vehicle.DoesNotExist:
            return Response(
                {"access": False, "message": "ОБ'ЄКТ НЕ ЗНАЙДЕНО", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )


class GuestVehicleCreateView(generics.CreateAPIView):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user

        serializer.save(
            created_by=user,
            owner_first_name=user.first_name or user.username,
            owner_last_name=user.last_name or "",
        )


class GuestVehicleListView(APIView):
    """Список гостьових авто (employee=null) — для адмінів/операторів"""

    permission_classes = [IsStaffUser]

    def get(self, request):
        guests = Vehicle.objects.filter(employee__isnull=True).order_by("-id")
        serializer = VehicleSerializer(guests, many=True)
        return Response(serializer.data)


class VehicleStatusUpdateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        plate = request.data.get("plate")
        action_type = request.data.get("action")
        if action_type == "to_black":
            BlackList.objects.get_or_create(plate_text=plate)
            return Response({"status": "blocked"})
        elif action_type == "to_white":
            BlackList.objects.filter(plate_text=plate).delete()
            return Response({"status": "unblocked"})
        return Response({"error": "Invalid action"}, status=400)


class IssueAPIKeyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan")
        durations = {
            "1_month": 30,
            "3_months": 90,
            "1_year": 365,
        }
        days = durations.get(plan)
        if not days:
            return Response(
                {"error": "Невірний тариф"}, status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils.timezone import now

        expires = now() + timedelta(days=days)

        api_key = APIKey.objects.create(
            user=request.user,
            expires_at=expires,
            plan=plan,
        )

        return Response(
            {
                "api_key": str(api_key.key),
                "expires_at": api_key.expires_at.isoformat(),
                "plan": plan,
            }
        )


class PhotoRecognitionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        user = request.user
        image_file = request.FILES.get("car_image")

        if not image_file:
            return Response({"error": "Файл не завантажено"}, status=400)

        is_staff = user.groups.filter(name__in=["Administrators", "Operators"]).exists()

        from django.utils.timezone import now

        # 1. Замість .exists() отримуємо сам об'єкт ключа
        active_key = APIKey.objects.filter(
            user=user, is_active=True, expires_at__gt=now()
        ).first() # Беремо перший активний ключ, якщо він є

        # 2. Перевірка лімітів (як і була)
        if not is_staff and not active_key:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.free_recognitions_used >= 1:
                return Response(
                    {"limit_reached": True, "message": "Безкоштовний ліміт вичерпано"}
                )

        engine = VisionEngine()
        analysis = engine.analyze_single_photo(image_file, save_to_archive=is_staff)

        # 3. ЛОГІКА СПИСАННЯ
        if not is_staff:
            if active_key:
                # Списуємо з платного ключа
                active_key.requests_used += 1
                active_key.save()
            else:
                # Списуємо безкоштовну спробу (твій існуючий код)
                profile.free_recognitions_used += 1
                profile.save()

        # 4. Відповідь (без змін)
        if not is_staff:
            return Response(
                {
                    "plate_text": analysis.get("plate_text"),
                    "confidence": analysis.get("confidence"),
                    "is_known": analysis.get("is_known"),
                    "owner_name": None,
                    "owner_phone": None,
                    "requests_left": (active_key.requests_limit - active_key.requests_used) if active_key else 0
                }
            )

        return Response(analysis)


class CameraViewSet(viewsets.ModelViewSet):
    """CRUD для камер / відеопотоків"""

    queryset = Camera.objects.all().order_by("-id")
    serializer_class = CameraSerializer
    permission_classes = [IsStaffUser]


class SystemStatusView(APIView):
    """Статус системи: CPU, RAM, диск, активні аналізатори, БД"""

    permission_classes = [IsStaffUser]

    def get(self, request):
        # Системні метрики
        cpu_percent = psutil.cpu_percent(interval=0.5)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # Метрики додатку
        active_count = len(active_analyzers)
        total_detections = DetectedPlate.objects.count()
        total_vehicles = Vehicle.objects.count()
        total_employees = Employee.objects.count()
        total_cameras = Camera.objects.filter(is_active=True).count()
        total_users = User.objects.count()

        # Розрахунок навантаження (зважений індекс)
        thread_load = min(active_count * 25, 100)  # кожен потік ~25%
        load_index = int(cpu_percent * 0.5 + memory.percent * 0.3 + thread_load * 0.2)
        load_index = min(load_index, 100)

        return Response(
            {
                "cpu_percent": cpu_percent,
                "memory_total_gb": round(memory.total / (1024**3), 1),
                "memory_used_gb": round(memory.used / (1024**3), 1),
                "memory_percent": memory.percent,
                "disk_total_gb": round(disk.total / (1024**3), 1),
                "disk_used_gb": round(disk.used / (1024**3), 1),
                "disk_percent": round(disk.percent, 1),
                "active_analyzers": active_count,
                "active_analyzer_names": list(active_analyzers.keys()),
                "load_index": load_index,
                "total_detections": total_detections,
                "total_vehicles": total_vehicles,
                "total_employees": total_employees,
                "total_cameras": total_cameras,
                "total_users": total_users,
                "frame_step": engine_config["frame_step"],
            }
        )


class FrameStepConfigView(APIView):
    """GET/POST для зміни frame_step (кількість кадрів між аналізами)"""

    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response({"frame_step": engine_config["frame_step"]})

    def post(self, request):
        value = request.data.get("frame_step")
        try:
            value = int(value)
            if value < 1 or value > 100:
                return Response(
                    {"error": "Значення повинно бути від 1 до 100"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            engine_config["frame_step"] = value
            return Response({"frame_step": value, "status": "updated"})
        except (TypeError, ValueError):
            return Response(
                {"error": "Невірне значення"}, status=status.HTTP_400_BAD_REQUEST
            )

